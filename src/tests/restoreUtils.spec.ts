import { jest } from "@jest/globals";
import type { SpyInstance } from "jest-mock";
import { nanoid } from "nanoid";
import { ERRORS, STATUS } from "../messages/index.js";
import { RenameItem, RenameItemsArray, RollbackFile } from "../types.js";
import * as restoreUtils from "../utils/restoreUtils.js";
import {
  checkFilesExistingMock,
  checkFilesTransforms,
  currentRenameList,
  mockRollbackToolSet,
  renameListDistinct
} from "./mocks.js";

const {
  checkExistingFiles,
  checkRestoreFile,
  determineRollbackLevel,
  isCurrentRestore,
  isLegacyRestore,
  legacyRestoreMapper,
  restoreByLevels,
} = restoreUtils;

const { incorrectRollbackFormat } = ERRORS.restoreFileMapper;
const { legacyConversion, rollbackLevelOverMax } = STATUS.restoreFileMapper;

jest.mock("nanoid");
const mockedNanoId = jest.mocked(nanoid);

describe("checkExistingFiles", () => {
  it("Should return proper list of filesToRestore and missingFiles", () => {
    const expected: { filesToRestore: string[]; missingFiles: string[] } = {
      filesToRestore: ["thirdFile", "secondFile", "firstFile"],
      missingFiles: ["fourthFile"],
    };
    const result = checkExistingFiles({
      existingFiles: checkFilesExistingMock,
      transforms: checkFilesTransforms,
    });
    expect(result).toEqual(expected);
  });
});

describe("determineRollbackLevel", () => {
  const rollbackLength = 10,
    transformList = new Array(rollbackLength).fill(
      currentRenameList
    ) as RenameItemsArray[];
  let spyOnConsole: SpyInstance;
  beforeEach(
    () =>
      (spyOnConsole = jest
        .spyOn(console, "log")
        .mockImplementation((message?: any) => {}))
  );
  afterEach(() => jest.clearAllMocks());
  afterAll(() => spyOnConsole.mockRestore());
  it("Should default to maximum restore level if rollbackLevel is not specified.", () => {
    expect(determineRollbackLevel({ transformList })).toBe(rollbackLength);
  });
  it("Should set restore level to maximum if rollbackLevel is over maximum", () => {
    expect(
      determineRollbackLevel({
        transformList,
        rollbackLevel: rollbackLength + 1,
      })
    ).toBe(rollbackLength);
  });
  it("Should default to maximum level, if rollback level is 0 or omitted", () => {
    [{ transformList }, { transformList, rollbackLevel: 0 }].forEach((args) =>
      expect(determineRollbackLevel(args)).toBe(rollbackLength)
    );
  });
  it("Should notify the user, if rollbackLevel is over maximum", () => {
    expect(spyOnConsole).not.toHaveBeenCalled();
    determineRollbackLevel({
      transformList,
      rollbackLevel: rollbackLength + 1,
    });
    expect(spyOnConsole).toHaveBeenCalledWith(rollbackLevelOverMax);
  });
  it("Should return the target index", () => {
    [1, 2, 3, 5].forEach((rollbackLevel) =>
      expect(
        determineRollbackLevel({
          transformList,
          rollbackLevel,
        })
      ).toBe(rollbackLevel)
    );
  });
});

describe("isLegacyRestore", () => {
  it("Should return false for falsy values and non-arrays", () => {
    for (const testCase of [
      undefined,
      null,
      "something",
      "",
      35,
      {},
      { property: "property" },
    ]) {
      expect(isLegacyRestore(testCase)).toBe(false);
    }
  });
  it("Should return false for new rename list types", () => {
    expect(isLegacyRestore(mockRollbackToolSet.mockRollbackFile)).toBe(false);
  });
  it("Should return true for a legacy restore list", () => {
    expect(isLegacyRestore(renameListDistinct)).toBe(true);
  });
});

describe("legacyRestoreMapper", () => {
  it("Should transform legacy rollback files", () => {
    renameListDistinct.forEach((entry, index) =>
      mockedNanoId.mockReturnValueOnce(`nanoCode-${index}`)
    );
    const mappedResult = legacyRestoreMapper(renameListDistinct);
    const mappedItems: RenameItemsArray[] = [
      renameListDistinct.map(({ original, rename }, index) => ({
        original,
        rename,
        referenceId: `nanoCode-${index}`,
      })),
    ];
    const expected: RollbackFile = {
      sourcePath: renameListDistinct[0].sourcePath,
      transforms: mappedItems,
    };
    expect(mappedResult).toEqual(expected);
  });
});

describe("isCurrentRestore", () => {
  const {sourcePath, mockRollbackFile} = mockRollbackToolSet
  it("Should return false for falsy values, arrays and primitives", () => {
    for (const testCase of [
      undefined,
      null,
      "something",
      "",
      35,
      [],
      [1, 2, 3],
    ]) {
      expect(isCurrentRestore(testCase)).toBe(false);
    }
  });
  it("Should return false for legacy rollback file", () =>
    expect(isCurrentRestore(renameListDistinct)).toBe(false));
  it("Should return true for new rename list type", () =>
    expect(isCurrentRestore(mockRollbackFile)).toBe(true));
  it("Should return false for improper top level keys", () => {
    const improperKeys = {
      firstProp: sourcePath,
      someTransformProp: [...mockRollbackFile.transforms],
    };
    expect(isCurrentRestore(improperKeys)).toBe(false);
  });
  it("Should return false if one of the transforms has improper key or non-string value", () => {
    const renameCopy = JSON.parse(
      JSON.stringify(mockRollbackFile)
    ) as RollbackFile;
    const improperKey = renameCopy.transforms[0].map(
      ({ original, referenceId, rename }) => ({
        original,
        rename,
        someReference: referenceId,
      })
    );
    const improperValue = renameCopy.transforms[0].map(
      ({ original, referenceId, rename }) => ({
        original,
        rename,
        referenceId: 55,
      })
    );
    for (const testCase of [improperKey, improperValue])
      expect(isCurrentRestore(testCase)).toBe(false);
  });
});

describe("checkRestoreFile", () => {
  const arg = "someArg";
  const spyOnCurrentRestore = jest.spyOn(restoreUtils, "isCurrentRestore"),
    spyOnLegacyRestore = jest.spyOn(restoreUtils, "isLegacyRestore"),
    spyOnLegacyRestoreMapper = jest.spyOn(restoreUtils, "legacyRestoreMapper");
  let spyOnConsole: SpyInstance<typeof console.log>;
  beforeEach(() => {
    spyOnConsole = jest
      .spyOn(console, "log")
      .mockImplementation((message?: any) => {});
    jest.clearAllMocks();
  });
  afterAll(() => spyOnConsole.mockRestore());
  it("Should throw an error, if supplied param is not legacy or current restore file", () => {
    [spyOnCurrentRestore, spyOnLegacyRestore].forEach((spy) =>
      spy.mockReturnValueOnce(false)
    );
    expect(() => checkRestoreFile(arg)).toThrowError(incorrectRollbackFormat);
  });
  it("Should return current rollback param directly", () => {
    spyOnCurrentRestore.mockReturnValueOnce(true);
    expect(checkRestoreFile(arg)).toEqual(arg);
    [spyOnLegacyRestore, spyOnConsole, spyOnLegacyRestoreMapper].forEach(
      (spy) => expect(spy).not.toHaveBeenCalled()
    );
  });
  it("Should emit message, and return result for legacy restore arg", () => {
    const mappedResult = "mappedResult";
    spyOnCurrentRestore.mockReturnValueOnce(false);
    spyOnLegacyRestore.mockReturnValueOnce(true);
    spyOnLegacyRestoreMapper.mockReturnValueOnce(mappedResult as any);
    expect(checkRestoreFile(arg)).toEqual(mappedResult);
    expect(spyOnConsole).toHaveBeenCalledWith(legacyConversion);
  });
});

describe("restoreByLevels", () => {
  const {
    mockItems: { mockItem1, mockItem2, mockItem3, mockItem4 },
    mockRollbackFile,
  } = mockRollbackToolSet;

  const testCases: { rollbackLevel: number; expected: RenameItem[] }[] = [
    {
      rollbackLevel: 1,
      expected: [mockItem1(4), mockItem3(2), mockItem2(3)],
    },
    {
      rollbackLevel: 2,
      expected: [
        { ...mockItem1(4), original: mockItem1(3).original },
        { ...mockItem3(2), original: mockItem3(1).original },
        { ...mockItem2(3), original: mockItem2(3).original },
      ],
    },
    {
      rollbackLevel: 3,
      expected: [
        { ...mockItem1(4), original: mockItem1(2).original },
        { ...mockItem3(2), original: mockItem3(1).original },
        { ...mockItem2(3), original: mockItem2(2).original },
        mockItem4(1),
      ],
    },
    {
      rollbackLevel: 0,
      expected: [
        { ...mockItem1(4), original: mockItem1(1).original },
        mockItem4(1),
        { ...mockItem3(2), original: mockItem3(1).original },
        { ...mockItem2(3), original: mockItem2(1).original },
      ],
    },
  ];
  it("Should return expected renames and target levels", () => {
    for (const { expected, rollbackLevel } of testCases) {
      const resultTransforms = restoreByLevels({
        rollbackFile: mockRollbackFile,
        rollbackLevel,
      }).transforms;
      expect(resultTransforms.length).toBe(expected.length);
      expected.forEach((obj) => {
        const targetTransform = resultTransforms.find(
          ({ referenceId }) => referenceId === obj.referenceId
        );
        expect(targetTransform).toEqual(obj);
      });
    }
  });
});
