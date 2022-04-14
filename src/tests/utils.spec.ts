import process from "process";
import {
  ComposeRenameStringArgs,
  ExtractBaseAndExtTemplate,
} from "../types.js";
import {
  areNewNamesDistinct,
  checkPath,
  composeRenameString,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt,
  truncateFile,
} from "../converters/utils.js";
import { rename, readdir, lstat } from "fs/promises";
import {
  mockFileList,
  expectedSplit,
  examplePath,
  truthyArgument,
  renameWithNewNameRepeat,
  renameListDistinct,
  renameListWithSameOriginalAndNew as sameOldAndNew,
  exampleStats,
  createDirentArray,
} from "./mocks.js";
import fs, { Dirent, existsSync, Stats } from "fs";
import { DEFAULT_SEPARATOR } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { join, resolve } from "path";

jest.mock("fs");
jest.mock("fs/promises", () => {
  const originalModule = jest.requireActual("fs/promises");
  return {
    ...originalModule,
    rename: jest.fn(),
    readdir: jest.fn(),
    lstat: jest.fn(),
  };
});
const mockedFs = jest.mocked(fs, true);
const mockedRename = jest.mocked(rename);
const mockedLstat = jest.mocked(lstat);
const mockedReadDir = jest.mocked(readdir);

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
describe("areNewNamesDistinct", () => {
  it("areNewNamesDistinct should return false if any of the new names are identical", () => {
    expect(areNewNamesDistinct(renameListDistinct)).toBe(true);
    expect(areNewNamesDistinct(renameWithNewNameRepeat)).toBe(false);
  });
});

/* describe("listFiles", ()=> {
  
}); */
describe("checkPath", () => {
  afterEach(() => jest.resetAllMocks());
  it("Should throw error, if path does not exist", async () => {
    mockedFs.existsSync.mockReturnValueOnce(false);
    await expect(() => checkPath(examplePath)).rejects.toThrowError(
      ERRORS.CHECK_PATH_DOES_NOT_EXIST
    );
  });
  it("Should throw error if path is not a directory", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => false,
    });

    await expect(checkPath(examplePath)).rejects.toThrowError(
      ERRORS.CHECK_PATH_NOT_A_DIR
    );
  });
  it("Should throw error, if directory has no files", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => true,
    });
    mockedReadDir.mockResolvedValueOnce(createDirentArray(10, 0));
    await expect(checkPath(examplePath)).rejects.toThrowError(
      ERRORS.CHECK_PATH_NO_CHILD_FILES
    );
  });
  it("Should return filePath, if it exists, is a directory, and has children of file type", async()=> {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedLstat.mockResolvedValueOnce({
      ...exampleStats,
      isDirectory: () => true,
    });
    mockedReadDir.mockResolvedValueOnce(createDirentArray(10, 3));
    expect(await checkPath(examplePath)).toBe(resolve(examplePath));
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
      ERRORS.TRUNCATE_INVALID_ARGUMENT
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
describe("composeRenameString", () => {
  const [baseName, ext, customText, newName] = [
    "baseName",
    ".ext",
    "customText",
    "newName",
  ];
  const defaultSep = DEFAULT_SEPARATOR;
  const args: ComposeRenameStringArgs = {
    baseName,
    ext,
    customText,
    newName,
    preserveOriginal: true,
  };
  it("Should return a newName-baseName.extension by default", () => {
    const expected = `${[newName, baseName].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, customText: undefined })).toBe(
      expected
    );
  });
  it("CustomText should override baseName and preserveOriginal", () => {
    const expected = `${[newName, customText].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, preserveOriginal: true })).toBe(
      expected
    );
  });
  it("Should drop original baseName, if preserveOriginal is false|undefined and no customText supplied", () => {
    const expected = `${newName}${ext}`;
    expect(
      composeRenameString({
        ...args,
        customText: undefined,
        preserveOriginal: undefined,
      })
    ).toBe(expected);
    expect(
      composeRenameString({
        ...args,
        customText: undefined,
        preserveOriginal: false,
      })
    ).toBe(expected);
  });
  it("Should return newName-baseName only, if extension is undefined", () => {
    const expected = `${newName}${defaultSep}${baseName}`;
    expect(
      composeRenameString({ ...args, customText: undefined, ext: undefined })
    ).toBe(expected);
  });
  it("Should respect textPosition", () => {
    let expected = `${[customText, newName].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, textPosition: "prepend" })).toBe(
      expected
    );
    expected = `${[newName, customText].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, textPosition: "append" })).toBe(
      expected
    );
  });
  it("Should respect separator setting", () => {
    const newSep = "_";
    const expected = `${[newName, customText].join(newSep)}${ext}`;
    expect(composeRenameString({ ...args, separator: newSep })).toBe(expected);
  });
  it("Should truncate result if truncate argument is truthy and preserveOriginal is true", () => {
    const expected = `${baseName.slice(0, 4)}${ext}`;
    const newArgs = {
      ...args,
      truncate: "4",
      customText: "",
      separator: "",
      newName: "",
    };
    expect(composeRenameString(newArgs)).toBe(expected);
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
    const expectedLength = sameOldAndNew.filter(
      (renameInfo) => renameInfo.original !== renameInfo.rename
    ).length;
    const batchPromise = createBatchRenameList(sameOldAndNew);
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
      const revertList = sameOldAndNew.map((renameInfo) => renameInfo.rename);
      const expectedLength = sameOldAndNew.filter(
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
