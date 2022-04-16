import fs, { PathLike } from "fs";
import { readFile, rename } from "fs/promises";
import * as restorePoint from "../converters/restorePoint.js";
import * as utils from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import type { RestoreBaseReturn } from "../types.js";
import {
  examplePath as transformPath,
  renameListDistinct as renameList,
} from "./mocks.js";
jest.mock("fs");
jest.mock("fs/promises", () => {
  return {
    readFile: jest.fn(),
    rename: jest.fn(),
  };
});

const { restoreBaseFunction, restoreOriginalFileNames, dryRunRestore } =
  restorePoint;

const missingDataMessage =
  "The following files did not have restore data available:";

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
      ERRORS.RESTORE_NO_FILES_TO_CONVERT
    );
  });
  it("Should throw error, if no rollbackFile exists", async () => {
    spyOnListFiles.mockResolvedValueOnce(mockFileList);
    mockedFs.existsSync.mockReturnValueOnce(false);
    await expect(() => restoreBaseFunction()).rejects.toThrowError(
      ERRORS.RESTORE_NO_ROLLBACK_FILE_TO_CONVERT
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
    spyOnListFiles.mockResolvedValueOnce(mockFileList);
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedReadFile.mockResolvedValueOnce(
      JSON.stringify(renameList.slice(0, -1))
    );
    const rollbackList = await restoreBaseFunction(transformPath);
    expect(rollbackList.rollbackData).toEqual(renameList.slice(0, -1));
    expect(rollbackList.missingFiles).toEqual(mockFileList.slice(-1));
    expect(rollbackList.filesToRestore).toEqual(mockFileList.slice(0, -1));
  });
});

describe("restoreOriginalFileNames", () => {
  afterEach(() => jest.clearAllMocks());
  it("Should call dryRunRestore, if dryRun is true", async () => {
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
    ).rejects.toThrowError(ERRORS.RESTORE_NO_VALID_DATA);
  });
  it("Should throw Error, if batchRenameLength is 0", async () => {
    spyOnCreateBatchRenameList.mockReturnValueOnce([]);
    spyOnRestoreBase.mockResolvedValueOnce({
      ...mockRestoreList,
      missingFiles: [mockFileList[0]],
    });
    await expect(() => restoreOriginalFileNames(baseArg)).rejects.toThrowError(
      ERRORS.RESTORE_COULD_NOT_BE_PARSED
    );
  });
  it("Should notify user about missing restore data", async () => {
    const spyOnConsole = jest
      .spyOn(console, "log")
      .mockImplementation((message) => {});
    spyOnCleanUpRollbackFile.mockImplementationOnce(
      ({ transformPath: string }) => Promise.resolve()
    );
    const missingFiles = [mockFileList[0], mockFileList[1]];
    spyOnCreateBatchRenameList.mockReturnValueOnce([Promise.resolve()]);
    spyOnRestoreBase.mockResolvedValueOnce({
      ...mockRestoreList,
      missingFiles,
    });
    await restoreOriginalFileNames(baseArg);
    const logCalledWith = spyOnConsole.mock.calls.map((call) => call[0]);
    spyOnConsole.mockRestore();
    [missingDataMessage, ...missingFiles].forEach((message) =>
      expect(logCalledWith.includes(message)).toBe(true)
    );
  });
  it("Should not notify users about missing files, if missingFiles empty", async () => {
    const spyOnConsole = jest
      .spyOn(console, "log")
      .mockImplementation((message) => {});
    spyOnCleanUpRollbackFile.mockImplementationOnce(
      ({ transformPath: string }) => Promise.resolve()
    );
    spyOnCreateBatchRenameList.mockReturnValueOnce(
      mockFileList.map((file) => Promise.resolve())
    );
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await restoreOriginalFileNames(baseArg);
    const calls = spyOnConsole.mock.calls.length;
    spyOnConsole.mockRestore();
    expect(calls).toBe(1);
  });
  it("Should notify user about the number of files that will be reverted", async () => {
    const spyOnConsole = jest
      .spyOn(console, "log")
      .mockImplementation((...message) => {});
    spyOnCleanUpRollbackFile.mockImplementationOnce(
      ({ transformPath: string }) => Promise.resolve()
    );
    spyOnCreateBatchRenameList.mockReturnValueOnce(
      mockFileList.map((file) => Promise.resolve())
    );
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await restoreOriginalFileNames(baseArg);
    const logCalledWith = spyOnConsole.mock.calls.map((call) => call[0]);
    spyOnConsole.mockRestore();
    const expected = `Will revert ${mockFileList.length} files...`;
    expect(logCalledWith).toContain(expected);
  });
  it("Should await all pending promises and call cleanUpRollbackFile", async () => {
    let resolved = 0;
    mockedRename.mockImplementation((oldPath: PathLike, newPath: PathLike) =>
      Promise.resolve()
    );
    const spyOnConsole = jest
      .spyOn(console, "log")
      .mockImplementation((...message) => {});
    spyOnCleanUpRollbackFile.mockImplementationOnce(
      ({ transformPath: string }) => Promise.resolve()
    );
    spyOnCreateBatchRenameList.mockReturnValueOnce(
      mockFileList.map((file) => {
        resolved++;
        return Promise.resolve();
      })
    );
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await restoreOriginalFileNames(baseArg);
    spyOnConsole.mockRestore();
    expect(resolved).toBe(mockFileList.length);
    expect(spyOnCleanUpRollbackFile).toHaveBeenCalledTimes(1);
  });
});
