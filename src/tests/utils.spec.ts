/* eslint-disable no-param-reassign */
import { jest } from "@jest/globals";
import fs, { Dirent } from "fs";
import { lstat, readdir, rename } from "fs/promises";
import { SpyInstance } from "jest-mock";
import path, { join, resolve } from "path";
import process from "process";
import { DEFAULT_SEPARATOR, ROLLBACK_FILE_NAME } from "../constants.js";
import * as formatTransform from "../converters/formatTextTransform.js";
import { ERRORS } from "../messages/errMessages.js";
import { STATUS } from "../messages/statusMessages.js";
import type {
  BaseRenameList,
  ComposeRenameStringArgs,
  ExtractBaseAndExtTemplate,
  RenameItemsArray,
  SplitFileList,
  ValidTypes
} from "../types.js";
import * as utils from "../utils/utils.js";
import {
  createDirentArray,
  examplePath,
  exampleStats,
  expectedSplit,
  generateRejected,
  mockFileList,
  mockRenameListToolSet,
  mockRollbackToolSet,
  truthyArgument
} from "./mocks.js";

const {
  areNewNamesDistinct,
  checkPath,
  composeRenameString,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt,
  extractCurrentReferences,
  listFiles,
  numberOfDuplicatedNames,
  parseBoolOption,
  parseRestoreArg,
  settledPromisesEval,
  sortedJsonReplicate,
  truncateFile,
  willOverWriteExisting,
} = utils;
const { noChildFiles, noChildDirs, noChildEntries, pathDoesNotExist, pathIsNotDir } = ERRORS.utils;

const { renameLists } = mockRenameListToolSet;
const { distinct, duplicateOriginalAndRename, newNameRepeat } = renameLists;

jest.mock("fs");
jest.mock("fs/promises", () => {
  const originalModule = jest.requireActual("fs/promises");
  return {
    ...(originalModule as object),
    rename: jest.fn(),
    readdir: jest.fn(),
    lstat: jest.fn(),
  };
});
const mockedFs = jest.mocked(fs),
  mockedRename = jest.mocked(rename),
  mockedLstat = jest.mocked(lstat),
  mockedReadDir = jest.mocked(readdir);

describe("parseBoolOption", () => {
  it("Should return default value, if arg is falsy or would throw error", () => {
    [undefined, null, 12345, "truthy", "falsy"].forEach((option) => {
      [false, true].forEach((defaultArg) => {
        expect(parseBoolOption(option, defaultArg)).toBe(defaultArg);
      });
    });
  });
  it("Should pass the parsed string boolean", () => {
    ["true", "false"].forEach((option) => {
      [false, true].forEach((defaultArg) => {
        expect(parseBoolOption(option, defaultArg)).toBe(JSON.parse(option));
      });
    });
  });
});

describe("parseRestoreArg", () => {
  it("Should return an integer for stringified number values", () => {
    for (const [arg, expected] of [
      ["1", 1],
      ["2", 2],
      ["-1", 1],
      ["2.15", 2],
    ]) {
      expect(parseRestoreArg(arg)).toBe(expected);
    }
  });
  it("True and false should be converted to 0", () => {
    [true, false].forEach((arg) => expect(parseRestoreArg(arg)).toBe(0));
  });
  it("Undefined, null, etc. should convert to 0", () => {
    [null, NaN, undefined].forEach((arg) => expect(parseRestoreArg(arg)).toBe(0));
  });
  it("Exception should return 0", () => {
    // eslint-disable-next-line symbol-description
    expect(parseRestoreArg(Symbol())).toBe(0);
  });
});

describe("extractCurrentReferences", () => {
  const {
    mockItems: { mockItem1, mockItem2, mockItem3 },
  } = mockRollbackToolSet;
  const transforms: RenameItemsArray[] = [
    [mockItem1(2), mockItem2(1)],
    [mockItem1(1), mockItem3(1)],
  ];
  const missingNames = ["missing1", "missing2"];
  const namesWithHistory = [mockItem1(2), mockItem1(1), mockItem3(1)];
  const suppliedNames = [...namesWithHistory.map(({ rename }) => rename), ...missingNames];

  it("Should allocate referenceIds to passed names", () => {
    const { noIds, withIds } = extractCurrentReferences(transforms, suppliedNames);
    const expectedWithIds = namesWithHistory.reduce((acc, current) => {
      acc[current.rename] = current.referenceId;
      return acc;
    }, {} as Record<string, string>);
    expect(noIds).toEqual(missingNames);
    expect(withIds).toEqual(expectedWithIds);
  });
});

describe("extractBaseAndExt", () => {
  it("Should separate the baseName and extension of differently formatted files", () => {
    const extracted = extractBaseAndExt(mockFileList, examplePath);
    extracted.forEach((extractedData, index) => {
      const targetSplit = expectedSplit[index];
      const expected: ExtractBaseAndExtTemplate = {
        baseName: targetSplit[0],
        ext: targetSplit[1],
        sourcePath: examplePath,
        type: "file",
      };
      expect(extractedData).toEqual(expected);
    });
  });
  it("Should not perform extension separation on directories", () => {
    const mockDirList: Dirent[] = mockFileList.map((fileInfo) => {
      fileInfo.isDirectory = () => true;
      fileInfo.isFile = () => true;
      return fileInfo;
    });
    const extracted = extractBaseAndExt(mockDirList, examplePath);
    extracted.forEach((extractedData, index) => {
      const expected: ExtractBaseAndExtTemplate = {
        baseName: expectedSplit[index].join(""),
        ext: "",
        sourcePath: examplePath,
        type: "directory",
      };
      expect(extractedData).toEqual(expected);
    });
  });
});

describe("listFiles", () => {
  afterEach(() => jest.resetAllMocks());
  it("Should return list of alphabetically sorted file names", async () => {
    const mockNames = ["zname", "aname", "bname", "123"];
    const sorted = [...mockNames].sort();
    const mockedDirent = createDirentArray(mockNames.length, mockNames.length).map(
      (dirent, index) => {
        dirent.name = mockNames[index];
        return dirent;
      }
    );
    mockedReadDir.mockResolvedValueOnce(mockedDirent);
    const resultNames = (await listFiles(examplePath)).map(({ name }) => name);
    expect(resultNames).toEqual(sorted);
  });
  it("Directories should be placed before files", async () => {
    const mockFileNames = ["aFile", "bFile", "cFile"],
      mockDirectoryNames = ["xDir", "yDir", "zDir"];
    const mockedDirent = createDirentArray(
      mockFileNames.length + mockDirectoryNames.length,
      mockFileNames.length,
      mockDirectoryNames.length
    );
    [...mockFileNames, ...mockDirectoryNames].forEach((entryName, index) => {
      mockedDirent[index].name = entryName;
    });
    mockedReadDir.mockResolvedValueOnce(mockedDirent);
    const resultNames = (await listFiles(examplePath, undefined, "all")).map(({ name }) => name);
    const mockDirNamesIndexes = mockDirectoryNames.map((dirName) => resultNames.indexOf(dirName)),
      mockFileNamesIndexes = mockFileNames.map((fileName) => resultNames.indexOf(fileName));

    const noNegativeIndex = [...mockDirNamesIndexes, ...mockFileNamesIndexes].every((i) => i >= 0);
    expect(noNegativeIndex).toBe(true);

    const maxDirIndex = Math.max(
        ...mockDirectoryNames.map((dirName) => resultNames.indexOf(dirName))
      ),
      minFileIndex = Math.min(...mockFileNamesIndexes);

    expect(maxDirIndex < minFileIndex).toBe(true);
  });
  it("Should return list of Dirents by default", async () => {
    const listLength = mockFileList.length;
    const sortedList = mockFileList.sort((a, b) =>
      a.name === b.name ? 0 : a.name < b.name ? -1 : 1
    );
    let exampleDirentArray = createDirentArray(listLength, listLength);
    exampleDirentArray = exampleDirentArray.map((dirent, index) => {
      dirent.name = mockFileList[index].name;
      return dirent;
    });
    mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
    const data = await listFiles(examplePath);
    expect(JSON.stringify(data)).toBe(JSON.stringify(sortedList));
  });
  it("Should exclude rollback file from list", async () => {
    const listLength = mockFileList.length + 1;
    let exampleDirentArray = createDirentArray(listLength, listLength);
    exampleDirentArray = exampleDirentArray.map((dirent, index) => {
      if (index >= mockFileList.length) {
        dirent.name = ROLLBACK_FILE_NAME;
      } else {
        dirent.name = mockFileList[index].name;
      }
      dirent.isFile = () => true;
      return dirent;
    });
    mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
    const foundFiles = await (await listFiles(examplePath)).map((file) => file.name);
    const isRollbackPresent = foundFiles.filter((file) => file === ROLLBACK_FILE_NAME).length > 0;
    expect(isRollbackPresent).toBe(false);
  });
  it("Should not include directories by default", async () => {
    const listLength = mockFileList.length;
    const exampleDirentArray = createDirentArray(listLength, listLength);
    exampleDirentArray[0].isFile = () => false;
    mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
    const foundFiles = await listFiles(examplePath);
    expect(foundFiles.length).toBe(listLength - 1);
  });
  it("Should include only directories, if targetType is set to dirs or all", async () => {
    const dirNum = 2,
      fileNum = 8;
    const sum = dirNum + fileNum;
    for (const target of ["dirs", "all"] as const) {
      const exampleDirentArray = createDirentArray(sum, fileNum, dirNum);
      mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
      const foundDirs = await listFiles(examplePath, undefined, target);
      const expected = target === "dirs" ? dirNum : sum;
      expect(foundDirs.length).toBe(expected);
    }
  });
  it("Should exclude files that match the exclude filter", async () => {
    const excludeFilter = "John";
    const direntLength = 10;
    const exampleDirentArray = createDirentArray(direntLength, direntLength);
    const shouldMatch = ["John", "Johnny", "Johnson"];
    shouldMatch.forEach((entry, index) => {
      exampleDirentArray[index].name = entry;
    });
    mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
    const foundFiles = await listFiles(examplePath, excludeFilter);
    expect(foundFiles.length).toBe(direntLength - shouldMatch.length);
    expect(foundFiles.filter((file) => shouldMatch.includes(file.name)).length).toBe(0);
  });
});
describe("areNewNamesDistinct", () => {
  it("areNewNamesDistinct should return false if any of the new names are identical", () => {
    expect(areNewNamesDistinct(distinct)).toBe(true);
    expect(areNewNamesDistinct(newNameRepeat)).toBe(false);
  });
});

describe("numberOfDuplicatedNames", () => {
  it("Should properly evaluate transform duplicates", () => {
    const checkType = "transforms";
    expect(numberOfDuplicatedNames({ renameList: distinct, checkType })).toBe(0);
    expect(
      numberOfDuplicatedNames({
        renameList: duplicateOriginalAndRename,
        checkType,
      })
    ).toBe(1);
  });
  it("Should properly evaluate rename duplicates", () => {
    const checkType = "results";
    expect(numberOfDuplicatedNames({ renameList: distinct, checkType })).toBe(0);
    expect(
      numberOfDuplicatedNames({
        renameList: newNameRepeat,
        checkType,
      })
    ).toBe(1);
  });
  it("Should return -1, if checkType is invalid", () => {
    expect(
      numberOfDuplicatedNames({
        renameList: distinct,
        checkType: "inexistent" as any,
      })
    ).toBe(-1);
  });
});

describe("willOverwriteExisting", () => {
  const ext = ".ext",
    originalNames = ["original1", "original2"],
    renames = ["rename1", "rename2"];
  const mockRenameList: BaseRenameList = originalNames.map((original, i) => ({
    original: original + ext,
    rename: renames[i] + ext,
  }));
  const mockSplitFile = originalNames.map((original) => ({
    baseName: original,
    ext,
  })) as SplitFileList;
  it("Should return false, if all existing files are renamed", () => {
    expect(willOverWriteExisting(mockRenameList, mockSplitFile)).toBe(false);
  });
  it("Should return false, if no renames would overwrite existing files", () => {
    const updatedSplitFile = [...mockSplitFile, { baseName: "other", ext }] as SplitFileList;
    expect(willOverWriteExisting(mockRenameList, updatedSplitFile)).toBe(false);
  });
  it("Should return true, if a rename would overwrite an existing file", () => {
    const updatedSplitFile = [...mockSplitFile, { baseName: "rename1", ext }] as SplitFileList;
    expect(willOverWriteExisting(mockRenameList, updatedSplitFile)).toBe(true);
  });
});

describe("checkPath", () => {
  const mockTargetDirResolve = () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => true,
    });
  };
  afterEach(() => jest.resetAllMocks());
  it("Should throw error, if path does not exist", async () => {
    mockedFs.existsSync.mockReturnValueOnce(false);
    await expect(() => checkPath(examplePath)).rejects.toThrowError(pathDoesNotExist);
  });
  it("Should throw error if path is not a directory", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => false,
    });

    await expect(checkPath(examplePath)).rejects.toThrowError(pathIsNotDir);
  });
  it("Should throw error, if directory has no child entries", async () => {
    mockTargetDirResolve();
    mockedReadDir.mockResolvedValueOnce([]);
    await expect(checkPath(examplePath)).rejects.toThrowError(noChildEntries);
  });
  it("Should throw error, if directory has no files, if fileType is undefined or set to 'files'", async () => {
    const fileTypes = [undefined, "files"] as const;
    for (const fileType of fileTypes) {
      mockTargetDirResolve();
      mockedReadDir.mockResolvedValueOnce(createDirentArray(10, 0, 10));
      await expect(checkPath(examplePath, fileType)).rejects.toThrowError(noChildFiles);
    }
  });
  it("Should throw error, if directory has no sub-directories if fileType is set to 'dirs'", async () => {
    mockTargetDirResolve();
    mockedReadDir.mockResolvedValueOnce(createDirentArray(10, 10, 0));
    await expect(checkPath(examplePath, "dirs")).rejects.toThrowError(noChildDirs);
  });
  it("Should return filePath, if targetType argument is true and targetPath has only dir entries", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => true,
    });
    mockedReadDir.mockResolvedValueOnce(createDirentArray(10, 0, 2));
    expect(await checkPath(examplePath, "all")).toBe(resolve(examplePath));
  });
  it("Should return target path if appropriate file types are found", async () => {
    const children = createDirentArray(10, 5, 5);
    const fileTypes: ValidTypes[] = ["all", "files", "dirs"];
    for (const fileType of fileTypes) {
      mockTargetDirResolve();
      mockedReadDir.mockResolvedValueOnce(children);
      const result = await checkPath(examplePath, fileType);
      expect(result).toBeDefined();
      expect(path.resolve(result)).toBe(path.resolve(examplePath));
    }
  });
});

describe("determineDir", () => {
  it("determineDir should return truthy argument, otherwise call process.cwd", () => {
    const spyOnCwd = jest.spyOn(process, "cwd").mockReturnValueOnce(examplePath);
    expect(determineDir(truthyArgument)).toBe(truthyArgument);
    expect(determineDir(undefined)).toBe(examplePath);
    expect(spyOnCwd).toHaveBeenCalledTimes(1);
  });
});

describe("composeRenameString", () => {
  const [baseName, ext, addText, newName] = ["baseName", ".ext", "addText", "newName"];
  const defaultSep = DEFAULT_SEPARATOR;
  const args: ComposeRenameStringArgs = {
    baseName,
    ext,
    addText,
    newName,
    preserveOriginal: true,
  };
  it("Should return a newName-baseName.extension by default", () => {
    const expected = `${[newName, baseName].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, addText: undefined })).toBe(expected);
  });
  it("addText should override baseName and preserveOriginal", () => {
    const expected = `${[newName, addText].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, preserveOriginal: true })).toBe(expected);
  });
  it("Should drop original baseName, if preserveOriginal is false|undefined and no addText supplied", () => {
    const expected = `${newName}${ext}`;
    expect(
      composeRenameString({
        ...args,
        addText: undefined,
        preserveOriginal: undefined,
      })
    ).toBe(expected);
    expect(
      composeRenameString({
        ...args,
        addText: undefined,
        preserveOriginal: false,
      })
    ).toBe(expected);
  });
  it("Should return newName-baseName only, if extension is undefined", () => {
    const expected = `${newName}${defaultSep}${baseName}`;
    expect(composeRenameString({ ...args, addText: undefined, ext: undefined })).toBe(expected);
  });
  it("Should respect textPosition", () => {
    let expected = `${[addText, newName].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, textPosition: "prepend" })).toBe(expected);
    expected = `${[newName, addText].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, textPosition: "append" })).toBe(expected);
  });
  it("Should respect separator setting", () => {
    const newSep = "_";
    const expected = `${[newName, addText].join(newSep)}${ext}`;
    expect(composeRenameString({ ...args, separator: newSep })).toBe(expected);
  });
  it("Should truncate result if truncate argument is truthy and preserveOriginal is true", () => {
    const expected = `${baseName.slice(0, 4)}${ext}`;
    const newArgs = {
      ...args,
      truncate: "4",
      addText: "",
      separator: "",
      newName: "",
    };
    expect(composeRenameString(newArgs)).toBe(expected);
  });
  it("Should call formatFile, if format argument is supplied", () => {
    const spyOnFormatFile = jest.spyOn(formatTransform, "formatFile");
    composeRenameString({ ...args, format: "uppercase" });
    expect(spyOnFormatFile).toHaveBeenCalledTimes(1);
  });
  it("Should return properly formatted file for different configurations", () => {
    const argsWithFormat: ComposeRenameStringArgs = {
      ...args,
      format: "uppercase",
      addText: undefined,
      preserveOriginal: false,
    };
    const noExtPreserve: ComposeRenameStringArgs = {
      ...argsWithFormat,
      noExtensionPreserve: true,
    };
    const [preserveExtResponse, noPreserveResponse] = [
      composeRenameString(argsWithFormat),
      composeRenameString(noExtPreserve),
    ];
    expect(preserveExtResponse).toBe("NEWNAME.ext");
    expect(noPreserveResponse).toBe("NEWNAME.EXT");
  });
});

describe("createBatchRenameList", () => {
  const conversionList = {
    sourcePath: examplePath,
    transforms: distinct,
  };
  beforeEach(() => mockedRename.mockReturnValue(Promise.resolve()));
  afterEach(() => mockedRename.mockReset());
  it("Should return renameList of appropriate length", () => {
    const expectedLength = conversionList.transforms.length;
    const batchPromise = createBatchRenameList(conversionList);
    expect(batchPromise.length).toBe(expectedLength);
  });
  it("batchList should contain appropriate data", async () => {
    const result: [string, string][] = [];
    mockedRename
      .mockReset()
      .mockImplementation(
        (originalPath, targetPath) =>
          Promise.resolve(
            result.push([originalPath as string, targetPath as string])
          ) as unknown as Promise<void>
      );
    createBatchRenameList(conversionList);
    conversionList.transforms.forEach((renameInfo, index) => {
      const { original, rename } = renameInfo,
        { sourcePath } = conversionList;
      const expected = [join(sourcePath, original), join(sourcePath, rename)];
      expect(result[index]).toEqual(expected);
    });
  });
  it("Should return renameList with length corresponding to unique names", () => {
    const expectedLength = duplicateOriginalAndRename.filter(
      (renameInfo) => renameInfo.original !== renameInfo.rename
    ).length;
    const batchPromise = createBatchRenameList({
      sourcePath: examplePath,
      transforms: duplicateOriginalAndRename,
    });
    expect(batchPromise.length).toBe(expectedLength);
  });

  describe("Revert operations", () => {
    beforeEach(() => mockedRename.mockReturnValue(Promise.resolve()));
    afterEach(() => mockedRename.mockReset());
    it("If filesToRevert are supplied, return appropriate batchRename list", () => {
      const revertList = conversionList.transforms.map((renameInfo) => renameInfo.rename);
      const expectedLength = revertList.length;
      const batchPromise = createBatchRenameList({
        ...conversionList,
        filesToRestore: revertList,
      });
      expect(batchPromise.length).toBe(expectedLength);
    });
    it("batchList should contain appropriate data", async () => {
      const filesToRestore = conversionList.transforms.map((renameInfo) => renameInfo.rename);
      const result: [string, string][] = [];
      mockedRename
        .mockReset()
        .mockImplementation(
          (originalPath, targetPath) =>
            Promise.resolve(
              result.push([originalPath as string, targetPath as string])
            ) as unknown as Promise<void>
        );
      createBatchRenameList({ ...conversionList, filesToRestore });
      conversionList.transforms.forEach((renameInfo, index) => {
        const { original, rename } = renameInfo,
          { sourcePath } = conversionList;
        const expected = [join(sourcePath, rename), join(sourcePath, original)];
        expect(result[index]).toEqual(expected);
      });
    });
    it("batchPromise list should not exceed filesToRevert's length", () => {
      const filesToRestore = conversionList.transforms
        .map((renameInfo) => renameInfo.rename)
        .slice(0, -1);
      const expectedLength = filesToRestore.length;
      const batchPromise = createBatchRenameList({
        ...conversionList,
        filesToRestore,
      });
      expect(batchPromise.length).toBe(expectedLength);
    });
    it("batchPromise list should not contain entries where original and renamed file names are identical", () => {
      const filesToRestore = duplicateOriginalAndRename.map((renameInfo) => renameInfo.rename);
      const expectedLength = duplicateOriginalAndRename.filter(
        (renameInfo) => renameInfo.original !== renameInfo.rename
      ).length;
      const batchPromise = createBatchRenameList({
        ...conversionList,
        filesToRestore,
      });
      expect(batchPromise.length).toBe(expectedLength);
    });
    it("batchPromise list should not include files whose names are not found in renameList", () => {
      const filesToRestore = conversionList.transforms.map((renameInfo) => renameInfo.rename);
      const truncatedRenameList = conversionList.transforms.slice(0, -1);
      const expectedLength = truncatedRenameList.length;
      const batchPromise = createBatchRenameList({
        ...conversionList,
        transforms: truncatedRenameList,
        filesToRestore,
      });
      expect(batchPromise.length).toBe(expectedLength);
    });
  });
});

describe("settledPromisesEval", () => {
  let spyOnConsole: SpyInstance;
  beforeEach(() => {
    spyOnConsole = jest.spyOn(console, "log").mockImplementation((message?: string) => {});
  });
  afterEach(() => spyOnConsole.mockRestore());
  const args = {
      transformedNames: distinct,
      operationType: "convert" as const,
    },
    settledLength = distinct.length,
    fulfilled = {
      status: "fulfilled",
      // eslint-disable-next-line no-void
      value: void 0,
    } as const;
  it("Should return unmodified rename list, if all promises are fulfilled", () => {
    const promiseResults = new Array(settledLength).fill(fulfilled) as PromiseSettledResult<void>[];
    const { failed, successful } = settledPromisesEval({
      ...args,
      promiseResults,
    });
    expect(successful).toEqual(args.transformedNames);
    expect(failed.length).toBe(0);
  });
  it("Should throw error, if all promises are rejected", () => {
    const promiseResults = new Array(settledLength)
      .fill(0)
      .map((entry, index) =>
        generateRejected(distinct[index], args.operationType)
      ) as PromiseSettledResult<void>[];

    expect(() => settledPromisesEval({ ...args, promiseResults })).toThrowError(
      ERRORS.utils.allRenameFailed
    );
  });
  it("Should remove entries that resulted in rejected promises", () => {
    const promiseResults: PromiseSettledResult<void>[] = [
      generateRejected(distinct[0], args.operationType),
      fulfilled,
      generateRejected(distinct[2], args.operationType),
    ];
    const { successful, failed } = settledPromisesEval({
      ...args,
      promiseResults,
    });
    expect(successful.length).toBe(distinct.length - 2);
    expect(successful).toEqual([distinct[1]]);
    expect(sortedJsonReplicate(failed)).toEqual(sortedJsonReplicate([distinct[0], distinct[2]]));
  });
  it("Should produce appropriate failReport and failItem messages", () => {
    const promiseResults: PromiseSettledResult<void>[] = [
      fulfilled,
      fulfilled,
      generateRejected(distinct[2], args.operationType),
    ];
    for (const operationType of ["convert", "restore"] as const) {
      const { failReport, failItem } = STATUS.settledPromisesEval;
      settledPromisesEval({ ...args, operationType, promiseResults });

      const expectedFailReport = failReport(1, operationType);
      const expectedFailItem = failItem(distinct[2].original, distinct[2].rename, operationType);

      expect(spyOnConsole).toHaveBeenCalledTimes(2);
      expect(spyOnConsole).toHaveBeenNthCalledWith(1, expectedFailReport);
      expect(spyOnConsole).toHaveBeenNthCalledWith(2, expectedFailItem);
      spyOnConsole.mockClear();
    }
  });
});

describe("truncateFile", () => {
  const truncateNum = 4;
  const generalArgs = {
    preserveOriginal: true,
    baseName: "baseName",
    truncate: truncateNum.toString(),
  };
  it("Should return baseName, if preserveOriginal is false", () => {
    const args = { ...generalArgs, preserveOriginal: false };
    expect(truncateFile(args)).toBe(args.baseName);
  });
  it("Should throw error, if truncate argument is invalid", () => {
    const invalidArgs = { ...generalArgs, truncate: "invalid" };
    expect(() => truncateFile(invalidArgs)).toThrowError(ERRORS.transforms.truncateInvalidArgument);
  });
  it("Should return baseName, if truncate argument evaluates to zero", () => {
    const zeroTruncate1 = { ...generalArgs, truncate: "" };
    const zeroTruncate2 = { ...generalArgs, truncate: "0" };
    [zeroTruncate1, zeroTruncate2].forEach((args) =>
      expect(truncateFile(args)).toBe(generalArgs.baseName)
    );
  });
  it("Should return truncated baseName", () => {
    expect(truncateFile(generalArgs).length).toBe(truncateNum);
  });
});
