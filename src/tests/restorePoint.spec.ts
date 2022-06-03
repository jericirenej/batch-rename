import fs, { PathLike } from "fs";
import { readFile, rename } from "fs/promises";
import * as restorePoint from "../converters/restorePoint.js";
import * as utils from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import { STATUS } from "../messages/statusMessages.js";
import type { RestoreBaseReturn } from "../types.js";
import {
  examplePath,
  examplePath as transformPath,
  renameListDistinct as renameList
} from "./mocks.js";
jest.mock("fs");
jest.mock("fs/promises", () => {
  return {
    readFile: jest.fn(),
    rename: jest.fn(),
  };
});
const { couldNotBeParsed, noFilesToConvert, noRollbackFile, noValidData } =
  ERRORS.restore;
const { restoreBaseFunction, restoreOriginalFileNames, dryRunRestore } =
  restorePoint;
const missingFilesMessage = STATUS.restore.restoreMissingFiles;

/** Will return spy if no mock is passed, or restoreMock, if mock is passed */
const consoleSetSpy = (): jest.SpyInstance => {
  return jest.spyOn(console, "log").mockImplementation((message: string) => {});
};

const spyOnListFiles = jest.spyOn(utils, "listFiles"),
  spyOnCleanUpRollbackFile = jest.spyOn(utils, "cleanUpRollbackFile"),
  spyOnCreateBatchRenameList = jest.spyOn(utils, "createBatchRenameList"),
  spyOnDryRunRestore = jest.spyOn(restorePoint, "dryRunRestore"),
  spyOnRestoreBase = jest.spyOn(restorePoint, "restoreBaseFunction");

const mockFileList = renameList.map((list) => list.rename);
const mockedFs = jest.mocked(fs, true);
const mockedReadFile = jest.mocked(readFile);
const mockedRename = jest.mocked(rename);

const baseArg = { transformPath };

const mockRestoreList: RestoreBaseReturn = {
  existingFiles: mockFileList,
  filesToRestore: mockFileList,
  missingFiles: [],
  rollbackData: renameList,
};

describe("restoreBaseFunction", () => {
  afterEach(() => jest.clearAllMocks());
  it("Should throw error, if no files exist in targetDir", async () => {
    spyOnListFiles.mockResolvedValueOnce([]);
    await expect(() => restoreBaseFunction()).rejects.toThrowError(
      noFilesToConvert
    );
  });
  it("Should throw error, if no rollbackFile exists", async () => {
    spyOnListFiles.mockResolvedValueOnce(mockFileList);
    mockedFs.existsSync.mockReturnValueOnce(false);
    await expect(() => restoreBaseFunction()).rejects.toThrowError(
      noRollbackFile
    );
  });
  it("Should return object with appropriate properties", async () => {
    spyOnListFiles.mockResolvedValueOnce(mockFileList);
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(renameList));
    const rollbackList = await restoreBaseFunction(transformPath);
    expect(rollbackList.rollbackData).toEqual(renameList);
    expect(rollbackList.existingFiles).toEqual(mockFileList);
    expect(rollbackList.missingFiles.length).toBe(0);
    expect(rollbackList.filesToRestore).toEqual(mockFileList);
  });
  it("Should log missing fileNames in restoreFile", async () => {
    spyOnListFiles.mockResolvedValueOnce(mockFileList.slice(0,-1));
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(renameList));
    const rollbackList = await restoreBaseFunction(transformPath);
    expect(rollbackList.missingFiles).toEqual(mockFileList.slice(-1));
    expect(rollbackList.filesToRestore).toEqual(mockFileList.slice(0, -1));
  });
});

describe("restoreOriginalFileNames", () => {
  let spyOnConsole: jest.SpyInstance;
  beforeEach(() => (spyOnConsole = consoleSetSpy()));
  afterEach(() => {
    jest.clearAllMocks();
    spyOnConsole.mockRestore();
  });
  it("Should call dryRunRestore, if dryRun arg is true", async () => {
    spyOnDryRunRestore.mockResolvedValueOnce();
    await restoreOriginalFileNames({ dryRun: true, transformPath });
    expect(spyOnDryRunRestore).toHaveBeenCalledTimes(1);
  });
  it("Should throw error, if restoreBaseFunction would return a falsy value", async () => {
    spyOnRestoreBase.mockResolvedValueOnce(
      undefined as unknown as RestoreBaseReturn
    );
    await expect(() =>
      restoreOriginalFileNames({ transformPath })
    ).rejects.toThrowError(noValidData);
  });
  it("Should throw Error, if batchRenameLength is 0", async () => {
    spyOnCreateBatchRenameList.mockReturnValueOnce([]);
    spyOnRestoreBase.mockResolvedValueOnce({
      ...mockRestoreList,
      missingFiles: [mockFileList[0]],
    });
    await expect(() => restoreOriginalFileNames(baseArg)).rejects.toThrowError(
      couldNotBeParsed
    );
  });
  it("Should notify user about missing restore data", async () => {
    spyOnCleanUpRollbackFile.mockImplementationOnce((baseArg) =>
      Promise.resolve()
    );
    const missingFiles = [mockFileList[0], mockFileList[1]];
    spyOnCreateBatchRenameList.mockReturnValueOnce([Promise.resolve()]);
    spyOnRestoreBase.mockResolvedValueOnce({
      ...mockRestoreList,
      missingFiles,
    });
    await restoreOriginalFileNames(baseArg);
    const logCalledWith = spyOnConsole.mock.calls.map((call) => call[0]);
    [missingFilesMessage, ...missingFiles].forEach((message) =>
      expect(logCalledWith.includes(message)).toBe(true)
    );
  });
  it("Should not notify users about missing files, if missingFiles empty", async () => {
    spyOnCleanUpRollbackFile.mockImplementationOnce((baseArg) =>
      Promise.resolve()
    );
    spyOnCreateBatchRenameList.mockReturnValueOnce(
      mockFileList.map((file) => Promise.resolve())
    );
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await restoreOriginalFileNames(baseArg);
    const calls = spyOnConsole.mock.calls.length;
    expect(calls).toBe(1);
  });
  it("Should notify user about the number of files that will be reverted", async () => {
    spyOnCleanUpRollbackFile.mockImplementationOnce((baseArg) =>
      Promise.resolve()
    );
    spyOnCreateBatchRenameList.mockReturnValueOnce(
      mockFileList.map((file) => Promise.resolve())
    );
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await restoreOriginalFileNames(baseArg);
    const logCalledWith = spyOnConsole.mock.calls.map((call) => call[0]);
    const expected = `Will revert ${mockFileList.length} files...`;
    expect(logCalledWith).toContain(expected);
  });
  it("Should await all pending promises and call cleanUpRollbackFile", async () => {
    let resolved = 0;
    mockedRename.mockImplementation((oldPath: PathLike, newPath: PathLike) =>
      Promise.resolve()
    );
    spyOnCleanUpRollbackFile.mockImplementationOnce((baseArg) =>
      Promise.resolve()
    );
    spyOnCreateBatchRenameList.mockReturnValueOnce(
      mockFileList.map((file) => {
        resolved++;
        return Promise.resolve();
      })
    );
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await restoreOriginalFileNames(baseArg);
    expect(resolved).toBe(mockFileList.length);
    expect(spyOnCleanUpRollbackFile).toHaveBeenCalledTimes(1);
  });
});

describe("dryRunRestore", () => {
  const generateDryRunMessage = (
    newName: string,
    originalName: string
  ): string => `${newName} --> ${originalName}`;
  let spyOnConsole: jest.SpyInstance;
  beforeEach(() => (spyOnConsole = consoleSetSpy()));
  afterEach(() => {
    jest.clearAllMocks();
    spyOnConsole.mockRestore();
  });
  it("Should call restoreBaseFunction", async () => {
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await dryRunRestore(examplePath);
    expect(spyOnRestoreBase).toHaveBeenCalledTimes(1);
  });
  it("Should throw error, if filesToRestore length is 0", async () => {
    spyOnRestoreBase.mockResolvedValueOnce({
      ...mockRestoreList,
      filesToRestore: [],
    });
    await expect(() => dryRunRestore(examplePath)).rejects.toThrow(
      couldNotBeParsed
    );
  });
  it("Should log appropriate information about file reverts", async () => {
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await dryRunRestore(examplePath);
    const calls = spyOnConsole.mock.calls.flat();
    const expectedIntro = `Will revert ${mockRestoreList.filesToRestore.length} files...`;
    expect(calls.includes(expectedIntro)).toBe(true);
    mockRestoreList.filesToRestore.forEach((fileInfo, index) => {
      const expected = generateDryRunMessage(
        fileInfo,
        mockRestoreList.rollbackData[index].original
      );
      expect(calls.includes(expected)).toBe(true);
    });
    expect(calls.includes(missingFilesMessage)).toBe(false);
  });
  it("Should log appropriate information about missing files", async () => {
    const modifiedArgs = {
      ...mockRestoreList,
      filesToRestore: mockFileList.slice(0, -1),
      missingFiles: mockFileList.slice(-1),
    };

    spyOnRestoreBase.mockResolvedValueOnce(modifiedArgs);
    await dryRunRestore(examplePath);
    const expectedIntro = `Will revert ${modifiedArgs.filesToRestore.length} files...`;
    const calls = spyOnConsole.mock.calls.flat();
    [expectedIntro, missingFilesMessage].forEach((message) =>
      expect(calls.includes(message)).toBe(true)
    );
    modifiedArgs.filesToRestore.forEach((fileInfo, index) => {
      const expected = generateDryRunMessage(
        fileInfo,
        modifiedArgs.rollbackData[index].original
      );
      expect(calls.includes(expected)).toBe(true);
    });
    modifiedArgs.missingFiles.forEach((missingFile) =>
      expect(calls.includes(missingFile)).toBe(true)
    );
  });
});
