import fs from "fs";
import { lstat, readdir, rename, unlink } from "fs/promises";
import { join, resolve } from "path";
import process from "process";
import { DEFAULT_SEPARATOR, ROLLBACK_FILE_NAME } from "../constants.js";
import * as formatTransform from "../converters/formatTextTransform.js";
import {
  areNewNamesDistinct,
  checkPath,
  cleanUpRollbackFile,
  composeRenameString,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt, listFiles,
  numberOfDuplicatedNames,
  truncateFile
} from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  ComposeRenameStringArgs,
  ExtractBaseAndExtTemplate
} from "../types.js";
import {
  createDirentArray,
  examplePath,
  exampleStats,
  expectedSplit,
  mockFileList,
  renameListDistinct,
  renameListWithDuplicateOldAndNew,
  renameWithNewNameRepeat,
  truthyArgument
} from "./mocks.js";

const { noChildFiles, pathDoesNotExist, pathIsNotDir } = ERRORS.utils;
const { noRollbackFile } = ERRORS.cleanRollback;

jest.mock("fs");
jest.mock("fs/promises", () => {
  const originalModule = jest.requireActual("fs/promises");
  return {
    ...originalModule,
    rename: jest.fn(),
    readdir: jest.fn(),
    lstat: jest.fn(),
    unlink: jest.fn(),
  };
});
const mockedFs = jest.mocked(fs, true);
const mockedRename = jest.mocked(rename);
const mockedLstat = jest.mocked(lstat);
const mockedReadDir = jest.mocked(readdir);
const mockedUnlink = jest.mocked(unlink);

describe("cleanUpRollbackFile", () => {
  const suppressStdOut = jest
    .spyOn(process.stdout, "write")
    .mockImplementation();
  const cleanUpArgs = { transformPath: examplePath };
  afterAll(() => suppressStdOut.mockRestore());
  afterEach(() => jest.resetAllMocks());
  it("Should throw error if rollback file does not exist", async () => {
    mockedFs.existsSync.mockReturnValueOnce(false);
    await expect(() => cleanUpRollbackFile(cleanUpArgs)).rejects.toThrowError(
      noRollbackFile
    );
  });
  it("Should call unlink with target path, if rollbackFile exists", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedUnlink.mockImplementationOnce(() => Promise.resolve());
    await cleanUpRollbackFile(cleanUpArgs);
    expect(mockedUnlink).toHaveBeenCalledTimes(1);
    expect(mockedUnlink).toHaveBeenLastCalledWith(
      resolve(examplePath, ROLLBACK_FILE_NAME)
    );
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
      };
      expect(extractedData).toEqual(expected);
    });
  });
});

describe("listFiles", () => {
  afterEach(() => jest.resetAllMocks());
  it("Should return list of names", async () => {
    const listLength = mockFileList.length;
    let exampleDirentArray = createDirentArray(listLength, listLength);
    exampleDirentArray = exampleDirentArray.map((dirent, index) => {
      dirent.name = mockFileList[index];
      return dirent;
    });
    mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
    expect(await listFiles(examplePath)).toEqual(mockFileList);
  });
  it("Should exclude rollback file from list", async () => {
    const listLength = mockFileList.length + 1;
    let exampleDirentArray = createDirentArray(listLength, listLength);
    exampleDirentArray = exampleDirentArray.map((dirent, index) => {
      if (index >= mockFileList.length) {
        dirent.name = ROLLBACK_FILE_NAME;
      } else {
        dirent.name = mockFileList[index];
      }
      dirent.isFile = () => true;
      return dirent;
    });
    mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
    const foundFiles = await listFiles(examplePath);
    const isRollbackPresent =
      foundFiles.filter((file) => file === ROLLBACK_FILE_NAME).length > 0;
    expect(isRollbackPresent).toBe(false);
  });
  it("Should not include directories", async () => {
    const listLength = mockFileList.length;
    let exampleDirentArray = createDirentArray(listLength, listLength);
    exampleDirentArray[0].isFile = () => false;
    mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
    const foundFiles = await listFiles(examplePath);
    expect(foundFiles.length).toBe(listLength - 1);
  });
  it("Should exclude files that match the exclude filter", async () => {
    const excludeFilter = "John";
    const direntLength = 10;
    const exampleDirentArray = createDirentArray(direntLength, direntLength);
    const shouldMatch = ["John", "Johnny", "Johnson"];
    shouldMatch.forEach(
      (entry, index) => (exampleDirentArray[index].name = entry)
    );
    mockedReadDir.mockResolvedValueOnce(exampleDirentArray);
    const foundFiles = await listFiles(examplePath, excludeFilter);
    expect(foundFiles.length).toBe(direntLength - shouldMatch.length);
    expect(foundFiles.filter((name) => shouldMatch.includes(name)).length).toBe(
      0
    );
  });
});
describe("areNewNamesDistinct", () => {
  it("areNewNamesDistinct should return false if any of the new names are identical", () => {
    expect(areNewNamesDistinct(renameListDistinct)).toBe(true);
    expect(areNewNamesDistinct(renameWithNewNameRepeat)).toBe(false);
  });
});

describe("numberOfDuplicatedNames", () => {
  it("Should properly evaluate transform duplicates", () => {
    const checkType = "transforms";
    expect(
      numberOfDuplicatedNames({ renameList: renameListDistinct, checkType })
    ).toBe(0);
    expect(
      numberOfDuplicatedNames({
        renameList: renameListWithDuplicateOldAndNew,
        checkType,
      })
    ).toBe(1);
  });
  it("Should properly evaluate rename duplicates", () => {
    const checkType = "results";
    expect(
      numberOfDuplicatedNames({ renameList: renameListDistinct, checkType })
    ).toBe(0);
    expect(
      numberOfDuplicatedNames({
        renameList: renameWithNewNameRepeat,
        checkType,
      })
    ).toBe(1);
  });
  it("Should return -1, if checkType is not properly specified", () => {
    expect(
      numberOfDuplicatedNames({
        renameList: renameListDistinct,
        checkType: "inexistent" as any,
      })
    ).toBe(-1);
  });
});

describe("checkPath", () => {
  afterEach(() => jest.resetAllMocks());
  it("Should throw error, if path does not exist", async () => {
    mockedFs.existsSync.mockReturnValueOnce(false);
    await expect(() => checkPath(examplePath)).rejects.toThrowError(
      pathDoesNotExist
    );
  });
  it("Should throw error if path is not a directory", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => false,
    });

    await expect(checkPath(examplePath)).rejects.toThrowError(pathIsNotDir);
  });
  it("Should throw error, if directory has no files", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => true,
    });
    mockedReadDir.mockResolvedValueOnce(createDirentArray(10, 0));
    await expect(checkPath(examplePath)).rejects.toThrowError(noChildFiles);
  });
  it("Should return filePath, if it exists, is a directory, and has children of file type", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => true,
    });
    mockedReadDir.mockResolvedValueOnce(createDirentArray(10, 3));
    expect(await checkPath(examplePath)).toBe(resolve(examplePath));
  });
});

describe("determineDir", () => {
  it("determineDir should return truthy argument, otherwise call process.cwd", () => {
    const spyOnCwd = jest
      .spyOn(process, "cwd")
      .mockReturnValueOnce(examplePath);
    expect(determineDir(truthyArgument)).toBe(truthyArgument);
    expect(determineDir(undefined)).toBe(examplePath);
    expect(spyOnCwd).toHaveBeenCalledTimes(1);
  });
});

describe("composeRenameString", () => {
  const [baseName, ext, addText, newName] = [
    "baseName",
    ".ext",
    "addText",
    "newName",
  ];
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
    expect(composeRenameString({ ...args, preserveOriginal: true })).toBe(
      expected
    );
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
    expect(
      composeRenameString({ ...args, addText: undefined, ext: undefined })
    ).toBe(expected);
  });
  it("Should respect textPosition", () => {
    let expected = `${[addText, newName].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, textPosition: "prepend" })).toBe(
      expected
    );
    expected = `${[newName, addText].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, textPosition: "append" })).toBe(
      expected
    );
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
  beforeEach(() => mockedRename.mockReturnValue(Promise.resolve()));
  afterEach(() => mockedRename.mockReset());
  it("Should return renameList of appropriate length", () => {
    const expectedLength = renameListDistinct.length;
    const batchPromise = createBatchRenameList(renameListDistinct);
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
    createBatchRenameList(renameListDistinct);
    renameListDistinct.forEach((renameInfo, index) => {
      const { original, rename, sourcePath } = renameInfo;
      const expected = [join(sourcePath, original), join(sourcePath, rename)];
      expect(result[index]).toEqual(expected);
    });
  });
  it("Should return renameList with length corresponding to unique names", () => {
    const expectedLength = renameListWithDuplicateOldAndNew.filter(
      (renameInfo) => renameInfo.original !== renameInfo.rename
    ).length;
    const batchPromise = createBatchRenameList(
      renameListWithDuplicateOldAndNew
    );
    expect(batchPromise.length).toBe(expectedLength);
  });
  describe("Revert operations", () => {
    beforeEach(() => mockedRename.mockReturnValue(Promise.resolve()));
    afterEach(() => mockedRename.mockReset());
    it("If filesToRevert are supplied, return appropriate batchRename list", () => {
      const revertList = renameListDistinct.map(
        (renameInfo) => renameInfo.rename
      );
      const expectedLength = revertList.length;
      const batchPromise = createBatchRenameList(
        renameListDistinct,
        revertList
      );
      expect(batchPromise.length).toBe(expectedLength);
    });
    it("batchList should contain appropriate data", async () => {
      const revertList = renameListDistinct.map(
        (renameInfo) => renameInfo.rename
      );
      const result: [string, string][] = [];
      mockedRename
        .mockReset()
        .mockImplementation(
          (originalPath, targetPath) =>
            Promise.resolve(
              result.push([originalPath as string, targetPath as string])
            ) as unknown as Promise<void>
        );
      createBatchRenameList(renameListDistinct, revertList);
      renameListDistinct.forEach((renameInfo, index) => {
        const { original, rename, sourcePath } = renameInfo;
        const expected = [join(sourcePath, rename), join(sourcePath, original)];
        expect(result[index]).toEqual(expected);
      });
    });
    it("batchPromise list should not exceed filesToRevert's length", () => {
      const revertList = renameListDistinct
        .map((renameInfo) => renameInfo.rename)
        .slice(0, -1);
      const expectedLength = revertList.length;
      const batchPromise = createBatchRenameList(
        renameListDistinct,
        revertList
      );
      expect(batchPromise.length).toBe(expectedLength);
    });
    it("batchPromise list should not contain entries where original and renamed file names are identical", () => {
      const revertList = renameListWithDuplicateOldAndNew.map(
        (renameInfo) => renameInfo.rename
      );
      const expectedLength = renameListWithDuplicateOldAndNew.filter(
        (renameInfo) => renameInfo.original !== renameInfo.rename
      ).length;
      const batchPromise = createBatchRenameList(
        renameListDistinct,
        revertList
      );
      expect(batchPromise.length).toBe(expectedLength);
    });
    it("batchPromise list should not include files whose names are not found in renameList", () => {
      const revertList = renameListDistinct.map(
        (renameInfo) => renameInfo.rename
      );
      const truncatedRenameList = renameListDistinct.slice(0, -1);
      const expectedLength = truncatedRenameList.length;
      const batchPromise = createBatchRenameList(
        truncatedRenameList,
        revertList
      );
      expect(batchPromise.length).toBe(expectedLength);
    });
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
    expect(() => truncateFile(invalidArgs)).toThrowError(
      ERRORS.transforms.truncateInvalidArgument
    );
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
