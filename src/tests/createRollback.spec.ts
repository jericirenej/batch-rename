import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { nanoid } from "nanoid";
import { BaseRenameItem, RenameItemsArray, RollbackFile } from "../types.js";
import * as rollbackUtils from "../utils/createRollback.js";
import * as restoreUtils from "../utils/restoreUtils.js";
import { mockRollbackToolSet } from "./mocks.js";

jest.mock("fs");
jest.mock("fs/promises", () => {
  const originalModule = jest.requireActual("fs/promises");
  return {
    __esModule: true,
    ...originalModule,
    readFile: jest.fn(),
  };
});

jest.mock("nanoid");
const mockedNano = jest.mocked(nanoid);

const mockedExistsSync = jest.mocked(existsSync);
const mockedReadFile = jest.mocked(readFile);
const spyOnCheckRestoreFile = jest.spyOn(restoreUtils, "checkRestoreFile");

const { readRollbackFile, createRollback } = rollbackUtils;

describe("readRollbackFile", () => {
  const { mockRollbackFile, sourcePath } = mockRollbackToolSet;
  afterEach(() => jest.clearAllMocks());
  it("Should return null if rollbackFile does not exist", async () => {
    mockedExistsSync.mockReturnValueOnce(false);
    expect(await readRollbackFile(sourcePath)).toBeNull();
  });
  it("Should call spyOnCheckRestoreFile", async()=> {
    expect(spyOnCheckRestoreFile).not.toHaveBeenCalled();
    mockedExistsSync.mockReturnValueOnce(true);
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(mockRollbackFile));
    await readRollbackFile(sourcePath);
    expect(spyOnCheckRestoreFile).toHaveBeenCalledTimes(1)
  })
  it("Should return rollbackFile if it exists", async () => {
    mockedExistsSync.mockReturnValueOnce(true);
    mockedReadFile.mockResolvedValueOnce(JSON.stringify(mockRollbackFile));
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
