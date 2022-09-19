import fs, { PathLike } from "fs";
import { readFile, rename } from "fs/promises";
import * as restorePoint from "../converters/restorePoint.js";
import * as utils from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import { STATUS } from "../messages/statusMessages.js";
import type { RestoreBaseReturn } from "../types.js";
import {
  examplePath as transformPath,
  mockDirentEntryAsFile,
  renameListDistinct as renameList
} from "./mocks.js";
jest.mock("fs",);
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

jest.mock("../messages/statusMessages.js");
const statusMocked = jest.mocked(STATUS);

/** Will return spy if no mock is passed, or restoreMock, if mock is passed */
const consoleSetSpy = (): jest.SpyInstance => {
  return jest.spyOn(console, "log").mockImplementation((message: string) => {});
};

const spyOnListFiles = jest.spyOn(utils, "listFiles"),
  spyOnCleanUpRollbackFile = jest.spyOn(utils, "cleanUpRollbackFile"),
  spyOnCreateBatchRenameList = jest.spyOn(utils, "createBatchRenameList"),
  spyOnDryRunRestore = jest.spyOn(restorePoint, "dryRunRestore"),
  spyOnRestoreBase = jest.spyOn(restorePoint, "restoreBaseFunction"),
  spyOnSettledPromisesEval = jest.spyOn(utils, "settledPromisesEval");

const mockRenamedList = renameList.map((fileItem) => fileItem.rename);
const mockFileList = mockRenamedList.map((file) => ({
  name: file,
  ...mockDirentEntryAsFile,
}));
const mockedFs = jest.mocked(fs);
const mockedReadFile = jest.mocked(readFile);
const mockedRename = jest.mocked(rename);

const baseArg = { transformPath };

const mockRestoreList: RestoreBaseReturn = {
  existingFiles: mockFileList.map((file) => file.name),
  filesToRestore: mockFileList.map((file) => file.name),
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
    expect(rollbackList.existingFiles).toEqual(mockRenamedList);
    expect(rollbackList.missingFiles.length).toBe(0);
    expect(rollbackList.filesToRestore).toEqual(mockRenamedList);
  });
  it("Should log missing fileNames in restoreFile", async () => {
    spyOnListFiles.mockResolvedValueOnce(mockFileList.slice(0, -1));
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(renameList));
    const rollbackList = await restoreBaseFunction(transformPath);
    expect(rollbackList.missingFiles).toEqual(mockRenamedList.slice(-1));
    expect(rollbackList.filesToRestore).toEqual(mockRenamedList.slice(0, -1));
  });
});

describe("restoreOriginalFileNames", () => {
  let spyOnConsole: jest.SpyInstance;
  beforeEach(() => (spyOnConsole = consoleSetSpy()));
  afterEach(() => {
    jest.clearAllMocks();
    spyOnConsole.mockRestore();
  });
  it("Should throw error, if restoreBaseFunction would return a falsy value", async () => {
    spyOnRestoreBase.mockResolvedValueOnce(
      undefined as unknown as RestoreBaseReturn
    );
    await expect(() =>
      restoreOriginalFileNames({ transformPath })
    ).rejects.toThrowError(noValidData);
  });
  it("Should throw error, if there are no files to restore", async () => {
    spyOnRestoreBase.mockResolvedValueOnce({
      ...mockRestoreList,
      filesToRestore: [],
    });
    await expect(() =>
      restoreOriginalFileNames({ transformPath })
    ).rejects.toThrow(couldNotBeParsed);
  });
  it("Should call dryRunRestore, if dryRun arg is true", async () => {
    spyOnDryRunRestore.mockResolvedValueOnce(false);
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await restoreOriginalFileNames({ dryRun: true, transformPath });
    expect(spyOnDryRunRestore).toHaveBeenCalledTimes(1);
  });
  it("If dryRunRestore is called, only perform restore, if it returns true", async () => {
    const testCases = [false, true];
    for (const testCase of testCases) {
      spyOnCreateBatchRenameList.mockClear();
      mockedFs.existsSync.mockReturnValueOnce(true);
      spyOnDryRunRestore.mockResolvedValueOnce(testCase);
      spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
      if (testCase) {
        spyOnCleanUpRollbackFile.mockImplementationOnce((baseArg) =>
          Promise.resolve()
        );
        spyOnCreateBatchRenameList.mockReturnValueOnce([Promise.resolve()]);
      }
      await restoreOriginalFileNames({ ...baseArg, dryRun: true });
      if (testCase) {
        expect(spyOnCreateBatchRenameList).toHaveBeenCalled();
      } else {
        expect(spyOnCreateBatchRenameList).not.toHaveBeenCalled();
      }
    }
  });
  it("Should throw Error, if batchRenameLength is 0", async () => {
    spyOnCreateBatchRenameList.mockReturnValueOnce([]);
    spyOnRestoreBase.mockResolvedValueOnce(mockRestoreList);
    await expect(() => restoreOriginalFileNames(baseArg)).rejects.toThrowError(
      couldNotBeParsed
    );
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
  it("Should call settledPromisesEval with appropriate args", async () => {
    spyOnCleanUpRollbackFile.mockImplementationOnce((baseArg) =>
      Promise.resolve()
    );
    // Presume that last file is missing.
    spyOnRestoreBase.mockResolvedValueOnce({
      ...mockRestoreList,
      filesToRestore: mockFileList
        .slice(0, -1)
        .map((fileInfo) => fileInfo.name),
    });
    // Make second promise reject, to test for proper truncating of renamed list.
    spyOnCreateBatchRenameList.mockReturnValueOnce([
      Promise.resolve(),
      Promise.reject(),
    ]);
    // Create the appropriate allSettled data.
    const promiseResults = [
      { status: "fulfilled", value: undefined },
      { status: "rejected", reason: undefined },
    ];
    const expectedArgs = {
      promiseResults,
      operationType: "restore",
      transformedNames: renameList.slice(0, -1),
    };
    await restoreOriginalFileNames(baseArg);
    expect(spyOnSettledPromisesEval).toHaveBeenCalledTimes(1);
    spyOnConsole.mockRestore();
    expect(spyOnSettledPromisesEval).toHaveBeenCalledWith(expectedArgs);
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
  let spyOnQuestion: jest.SpyInstance, spyOnConsole: jest.SpyInstance;

  beforeEach(() => {
    spyOnConsole = consoleSetSpy();
    spyOnQuestion = jest.spyOn(utils, "askQuestion");
  });
  afterEach(() => {
    jest.clearAllMocks();
    spyOnQuestion.mockRestore();
    spyOnConsole.mockRestore();
  });
  it("Should return true or false, depending on user input", async () => {
    const expectTrue = ["y", "Y", "yes", "YeS", "YES"].map((answer) => ({
      answer,
      expected: true,
    }));
    const expectFalse = ["n", "No", "N", "ye", "YE", "exit", "abc"].map(
      (answer) => ({ answer, expected: false })
    );
    for (const { answer, expected } of [...expectTrue, ...expectFalse]) {
      spyOnQuestion.mockResolvedValueOnce(answer);
      expect(await dryRunRestore(mockRestoreList)).toBe(expected);
    }
  });
  it("Should log appropriate information about file reverts", async () => {
    const spyOnTable = jest.spyOn(console, "table");
    spyOnQuestion.mockResolvedValueOnce("yes");
    await dryRunRestore(mockRestoreList);
    const expectedTable = mockRestoreList.rollbackData.map(
      ({ rename, original }) => ({ current: rename, restored: original })
    );
    expect(statusMocked.restore.restoreMessage).toHaveBeenLastCalledWith(
      mockRestoreList.filesToRestore.length
    );
    expect(spyOnTable).toHaveBeenCalledWith(expectedTable, [
      "current",
      "restored",
    ]);
  });
  it("Should log appropriate information about missing files", async () => {
    spyOnQuestion.mockResolvedValue("yes");
    const modifiedArgs = {
      ...mockRestoreList,
      filesToRestore: mockRenamedList.slice(0, -1),
      missingFiles: mockRenamedList.slice(-1),
    };
    await dryRunRestore(modifiedArgs);
    expect(statusMocked.restore.warningMissingFiles).toHaveBeenLastCalledWith(
      modifiedArgs.missingFiles.length
    );
    expect(spyOnConsole).toHaveBeenLastCalledWith(modifiedArgs.missingFiles);
  });
});
