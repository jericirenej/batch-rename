import { jest } from "@jest/globals";
import type { BaseRenameItem, RenameItemsArray, RollbackFile } from "batch-rename-lib";
import { ERRORS, ROLLBACK_FILE_NAME } from "batch-rename-lib";
import fs, { existsSync } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";
import { nanoid } from "nanoid";
import { resolve } from "path";
import process from "process";
import * as restoreUtils from "../utils/restoreUtils.js";
import * as rollbackUtils from "../utils/rollbackUtils.js";
import { jsonParseReplicate } from "../utils/utils.js";
import { examplePath, mockRollbackToolSet } from "./mocks.js";

jest.mock("fs");
jest.mock("fs/promises", () => {
  const originalModule = jest.requireActual("fs/promises");
  return {
    __esModule: true,
    ...(originalModule as object),
    readFile: jest.fn(),
    unlink: jest.fn(),
    writeFile: jest.fn(),
  };
});
const mockedExistsSync = jest.mocked(existsSync),
  mockedReadFile = jest.mocked(readFile),
  mockedUnlink = jest.mocked(unlink),
  mockedWriteFile = jest.mocked(writeFile),
  mockedFs = jest.mocked(fs);

jest.mock("nanoid");
const mockedNano = jest.mocked(nanoid);

const spyOnCheckRestoreFile = jest.spyOn(restoreUtils, "checkRestoreFile");

const {
  readRollbackFile,
  createRollback,
  deleteRollbackFile,
  trimRollbackFile,
} = rollbackUtils;

const { noRollbackFile } = ERRORS.cleanRollback;

const existsAndReadMock = (
  exists = true,
  mocked: RollbackFile = mockRollbackToolSet.mockRollbackFile
): void => {
  mockedExistsSync.mockReturnValueOnce(exists);
  if (exists) mockedReadFile.mockResolvedValueOnce(JSON.stringify(mocked));
};

describe("readRollbackFile", () => {
  const { mockRollbackFile, sourcePath } = mockRollbackToolSet;
  afterEach(() => jest.clearAllMocks());
  it("Should return null if rollbackFile does not exist", async () => {
    mockedExistsSync.mockReturnValueOnce(false);
    expect(await readRollbackFile(sourcePath)).toBeNull();
  });
  it("Should call spyOnCheckRestoreFile", async () => {
    expect(spyOnCheckRestoreFile).not.toHaveBeenCalled();
    existsAndReadMock();
    await readRollbackFile(sourcePath);
    expect(spyOnCheckRestoreFile).toHaveBeenCalledTimes(1);
  });
  it("Should return rollbackFile if it exists", async () => {
    existsAndReadMock();
    expect(await readRollbackFile(sourcePath)).toEqual(mockRollbackFile);
  });
});

describe("createRollbackFile", () => {
  const spyOnReadRollback = jest.spyOn(rollbackUtils, "readRollbackFile");
  const { mockItems, sourcePath, removeReference } = mockRollbackToolSet;
  const { mockItem1, mockItem2, mockItem3, mockItem4 } = mockItems;

  afterEach(() => jest.clearAllMocks());
  afterAll(() => spyOnReadRollback.mockRestore());

  it("If no rollback exists, return new rollback file with referenceIds", async () => {
    // TEST SETUP
    const expectedTransforms: RenameItemsArray = [1, 2, 3].map((num) =>
      mockItems[`mockItem${num}` as keyof typeof mockItems](1)
    );
    const providedNames: BaseRenameItem[] = expectedTransforms.map(
      ({ original, rename }) => ({ original, rename })
    );
    expectedTransforms.forEach(({ referenceId }) =>
      mockedNano.mockReturnValueOnce(referenceId)
    );
    spyOnReadRollback.mockResolvedValueOnce(null);
    const rollbackFile = await createRollback({
      transforms: providedNames,
      sourcePath,
    });

    expect(rollbackFile).toEqual({
      sourcePath,
      transforms: [expectedTransforms],
    });
  });

  it("If rollback file exists, preserve previous transforms and return new transforms with referenceIds for new items", async () => {
    // TEST SETUP
    const currentTransforms: RenameItemsArray[] = [
      [mockItem1(2), mockItem2(2)],
      [mockItem3(1)],
      [mockItem4(1)],
    ];
    const currentRollback: RollbackFile = {
      sourcePath,
      transforms: currentTransforms,
    };

    const missingNames: BaseRenameItem[] = [1, 2].map((num) => ({
      original: `missing${num}_1`,
      rename: `missing${num}_2`,
    }));
    const missingWithIds: RenameItemsArray = missingNames.map(
      (entry, index) => ({ ...entry, referenceId: `missing${index + 1}` })
    );
    missingWithIds.forEach(({ referenceId }) =>
      mockedNano.mockReturnValueOnce(referenceId)
    );
    spyOnReadRollback.mockResolvedValueOnce(currentRollback);
    const suppliedWithHistory = [
      mockItem1(3),
      mockItem2(3),
      mockItem3(2),
      mockItem4(2),
    ];
    const suppliedNames = [
      ...removeReference(...suppliedWithHistory),
      ...missingNames,
    ];

    // Execution
    const { transforms } = await createRollback({
      transforms: suppliedNames,
      sourcePath,
    });

    const expectedNewTransform = [...missingWithIds, ...suppliedWithHistory];

    // Previous transforms should be preserver
    const [newTransforms, ...prevTransforms] = transforms;

    expect(prevTransforms).toEqual(currentTransforms);

    expect(newTransforms.length).toBe(expectedNewTransform.length);
    expectedNewTransform.forEach((transform) => {
      const target = newTransforms.find(
        ({ referenceId }) => referenceId === transform.referenceId
      );
      expect(target).toEqual(transform);
    });
  });
});

describe("deleteRollbackFile", () => {
  it("Should throw error if rollback file does not exist", async () => {
    mockedFs.existsSync.mockReturnValueOnce(false);
    await expect(() => deleteRollbackFile()).rejects.toThrowError(
      noRollbackFile
    );
  });
  it("Should call unlink with target path, if rollback exists", async () => {
    mockedFs.existsSync.mockReturnValueOnce(true);
    mockedUnlink.mockImplementationOnce(() => Promise.resolve());
    await deleteRollbackFile(examplePath);
    expect(mockedUnlink).toHaveBeenCalledTimes(1);
    expect(mockedUnlink).toHaveBeenLastCalledWith(
      resolve(examplePath, ROLLBACK_FILE_NAME)
    );
    mockedUnlink.mockClear();
  });
});

describe("trimRollbackFile", () => {
  const { mockRollbackFile, sourcePath, mockTransforms } = mockRollbackToolSet;
  const suppressStdOut = jest
    .spyOn(process.stdout, "write")
    .mockImplementation((message) => true);
  const suppressConsole = jest
    .spyOn(console, "log")
    .mockImplementation((message) => {});

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => {
    suppressStdOut.mockRestore();
    suppressConsole.mockRestore();
  });

  const trimArgs = {
    sourcePath,
    targetLevel: 0,
    failed: [],
  };
  it("Should throw error if rollback file does not exist", async () => {
    mockedFs.existsSync.mockReturnValueOnce(false);
    await expect(() => trimRollbackFile(trimArgs)).rejects.toThrowError(
      noRollbackFile
    );
  });
  it("Should call unlink with target path, if target level is high enough to rollback all changes", async () => {
    for (const modLength of [0, 1]) {
      existsAndReadMock();
      const targetLevel = mockTransforms.length + modLength;
      mockedUnlink.mockImplementationOnce(() => Promise.resolve());
      await trimRollbackFile({ ...trimArgs, targetLevel });
      expect(mockedUnlink).toHaveBeenCalledTimes(1);
      expect(mockedUnlink).toHaveBeenLastCalledWith(
        resolve(examplePath, ROLLBACK_FILE_NAME)
      );
      mockedUnlink.mockClear();
    }
  });
  it("Should call writeFile with trimmed rollback file", async () => {
    for (const modLength of [-1, -2]) {
      existsAndReadMock();
      const targetLevel = mockTransforms.length + modLength;
      mockedWriteFile.mockImplementationOnce((args) => Promise.resolve());
      await trimRollbackFile({ ...trimArgs, targetLevel });
      const expectedRollback = {
        ...mockRollbackFile,
        transforms: mockTransforms.slice(targetLevel),
      };
      expect(mockedWriteFile).toHaveBeenCalledTimes(1);
      expect(mockedWriteFile).toHaveBeenLastCalledWith(
        resolve(examplePath, ROLLBACK_FILE_NAME),
        JSON.stringify(expectedRollback, undefined, 2),
        "utf-8"
      );
      mockedWriteFile.mockClear();
    }
  });
  it("Should not delete if any restores have failed", async () => {
    existsAndReadMock();
    const targetLevel = mockTransforms.length;
    const failed: RenameItemsArray = [mockTransforms[0][0]];
    await trimRollbackFile({ sourcePath, targetLevel, failed });
    expect(mockedUnlink).not.toHaveBeenCalled();
  });
  it("Should prepend failed restore items to rollback file", async () => {
    const failed: RenameItemsArray = [mockTransforms[0][0]];
    // Test for cases where transforms remain after trim and for complete restore.
    for (const modLength of [-1, 0]) {
      existsAndReadMock();
      mockedWriteFile.mockImplementationOnce((args) => Promise.resolve());
      const targetLevel = mockTransforms.length + modLength;
      await trimRollbackFile({ failed, sourcePath, targetLevel });
      const expectedLength = mockTransforms.length - targetLevel + 1;

      const lastRollbackWriteCall = jsonParseReplicate<RollbackFile>(
        mockedWriteFile.mock.lastCall![1] as string
      );
      expect(lastRollbackWriteCall.transforms.length).toBe(expectedLength);
      expect(lastRollbackWriteCall.transforms[0]).toEqual(failed);
    }
  });
  it("Should modify failed items original name to equal rename of an existing entry with same referenceId in next restore", async () => {
    const {
      mockItems: { mockItem1, mockItem2 },
    } = mockRollbackToolSet;
    const newTransforms: RenameItemsArray[] = [
      [mockItem1(3), mockItem2(2)],
      [mockItem1(2)],
      [mockItem1(1), mockItem2(1)],
    ];
    const newRollback: RollbackFile = {
      ...mockRollbackFile,
      transforms: newTransforms,
    };
    const testCases = [
      {
        failed: [mockItem1(3)],
        targetLevel: 2,
        expected: { ...mockItem1(3), original: mockItem1(1).rename },
      },
      {
        failed: [mockItem2(2)],
        targetLevel: 1,
        expected: mockItem2(2),
      },
      {
        failed: [mockItem2(2)],
        targetLevel: 2,
        expected: { ...mockItem2(2), original: mockItem2(1).rename },
      },
    ];

    for (const { failed, targetLevel, expected } of testCases) {
      existsAndReadMock(true, newRollback);
      await trimRollbackFile({ sourcePath, targetLevel, failed });
      const lastRollbackWriteCall = jsonParseReplicate<RollbackFile>(
        mockedWriteFile.mock.lastCall![1] as string
      );
      expect(lastRollbackWriteCall.transforms[0][0]).toEqual(expected);
    }
  });
});
