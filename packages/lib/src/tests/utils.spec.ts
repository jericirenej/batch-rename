/* eslint-disable no-param-reassign */
import { jest } from "@jest/globals";
import fs, { Dirent } from "fs";
import { lstat, readdir } from "fs/promises";
import path, { resolve } from "path";
import process from "process";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { ExtractBaseAndExtTemplate, ValidTypes } from "../types.js";
import { mocks } from "../utils/mocks.js";

import { checkPath, determineDir, extractBaseAndExt, listFiles } from "../utils/utils.js";

const {
  createDirentArray,
  examplePath,
  exampleStats,
  expectedSplit,
  mockFileList,
  truthyArgument,
} = mocks;
const { noChildFiles, noChildDirs, noChildEntries, pathDoesNotExist, pathIsNotDir } = ERRORS.utils;

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
  mockedLstat = jest.mocked(lstat),
  mockedReadDir = jest.mocked(readdir);

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
