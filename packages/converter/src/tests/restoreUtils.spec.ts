/* eslint-disable @typescript-eslint/no-loop-func */
import type { RenameItem, RenameItemsArray, RollbackFile } from "@batch-rename/lib";
import { ERRORS, STATUS, jsonReplicate } from "@batch-rename/lib";
import { jest } from "@jest/globals";
import type { SpyInstance } from "jest-mock";
import { nanoid } from "nanoid";
import * as restoreUtils from "../utils/restoreUtils.js";
import { mockRollbackToolSet } from "./mocks.js";

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
const { legacyConversion, rollbackLevelOverMax } = STATUS;
const { mockLegacyRollback, mockRollbackFile, mockTransforms, mockItems } = mockRollbackToolSet;

jest.mock("nanoid");
const mockedNanoId = jest.mocked(nanoid);

describe("checkExistingFiles", () => {
  const { mockItem1, mockItem2, mockItem3, mockItem4 } = mockItems;
  const mockTransform: RenameItemsArray[] = [
    [mockItem1(2), mockItem2(1)],
    [mockItem1(1), mockItem3(1), mockItem4(1)],
  ];
  const allPossibleFiles = [mockItem1(2), mockItem2(1), mockItem3(1), mockItem4(1)].map(
    ({ rename }) => rename
  );

  it("Should return all matched existing files at a given level and warn if files are missing", () => {
    const missingAtSecondLevel = mockItem4(1).rename;
    const missingAtFirstLevel = mockItem2(1).rename;
    const allMissing = [missingAtSecondLevel, missingAtFirstLevel];
    const existingWithoutMissed = allPossibleFiles.filter((name) => !allMissing.includes(name));
    const testCases = [
      {
        rollbackLevel: 1,
        expected: {
          restore: [mockItem1(2).rename],
          missing: [missingAtFirstLevel],
        },
      },
      {
        rollbackLevel: 2,
        expected: { restore: existingWithoutMissed, missing: allMissing },
      },
    ];
    for (const {
      rollbackLevel,
      expected: { restore, missing },
    } of testCases) {
      const { filesToRestore, missingFiles } = checkExistingFiles({
        rollbackLevel,
        transforms: mockTransform,
        existingFiles: existingWithoutMissed,
      });
      expect(jsonReplicate(filesToRestore).sort()).toEqual(jsonReplicate(restore).sort());

      expect(jsonReplicate(missingFiles).sort()).toEqual(jsonReplicate(missing).sort());
    }
  });
  it("Should ignore existing files that are not included inside transform file", () => {
    const allPossibleWithExcess = [...allPossibleFiles, "excess"];
    const { filesToRestore, missingFiles } = checkExistingFiles({
      transforms: mockTransform,
      rollbackLevel: 2,
      existingFiles: allPossibleWithExcess,
    });
    expect(jsonReplicate(filesToRestore).sort()).toEqual(jsonReplicate(allPossibleFiles).sort());
    expect(missingFiles.length).toBe(0);
  });
});

describe("determineRollbackLevel", () => {
  const rollbackLength = 10,
    transformList = new Array(rollbackLength).fill(mockTransforms[0]) as RenameItemsArray[];
  let spyOnConsole: SpyInstance;
  beforeEach(() => {
    spyOnConsole = jest.spyOn(console, "log").mockImplementation((message?: any) => {});
  });
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
    for (const testCase of [undefined, null, "something", "", 35, {}, { property: "property" }]) {
      expect(isLegacyRestore(testCase)).toBe(false);
    }
  });
  it("Should return false for new rename list types", () => {
    expect(isLegacyRestore(mockRollbackToolSet.mockRollbackFile)).toBe(false);
  });
  it("Should return true for a legacy restore list", () => {
    expect(isLegacyRestore(mockLegacyRollback)).toBe(true);
  });
});

describe("legacyRestoreMapper", () => {
  it("Should transform legacy rollback files", () => {
    mockTransforms[0].forEach(({ referenceId }) => mockedNanoId.mockReturnValueOnce(referenceId));
    const mappedResult = legacyRestoreMapper(mockLegacyRollback);
    const expected: RollbackFile = {
      ...mockRollbackFile,
      transforms: [mockTransforms[0]],
    };
    expect(mappedResult).toEqual(expected);
  });
});

describe("isCurrentRestore", () => {
  const { sourcePath, mockRollbackFile, mockTransforms } = mockRollbackToolSet;
  it("Should return false for falsy values, arrays and primitives", () => {
    for (const testCase of [undefined, null, "something", "", 35, [], [1, 2, 3]]) {
      expect(isCurrentRestore(testCase)).toBe(false);
    }
  });
  it("Should return false for legacy rollback file", () =>
    expect(isCurrentRestore(mockLegacyRollback)).toBe(false));
  it("Should return true for new rename list type", () =>
    expect(isCurrentRestore(mockRollbackFile)).toBe(true));
  it("Should return false for improper top level property names", () => {
    const improperKeys = {
      firstProp: sourcePath,
      someTransformProp: [...mockRollbackFile.transforms],
    };
    expect(isCurrentRestore(improperKeys)).toBe(false);
  });
  it("Should return false if one of the transforms has improper key or non-string value", () => {
    const renameCopy = JSON.parse(JSON.stringify(mockRollbackFile)) as RollbackFile;
    const improperKey = renameCopy.transforms[0].map(({ original, referenceId, rename }) => ({
      original,
      rename,
      someReference: referenceId,
    }));
    const improperValue = renameCopy.transforms[0].map(({ original, rename }) => ({
      original,
      rename,
      referenceId: 55,
    }));
    for (const testCase of [improperKey, improperValue])
      expect(isCurrentRestore(testCase)).toBe(false);
  });
  it("Should return true for rollbacks with additional properties", () => {
    const transformsWithExtra = mockTransforms.map((arr) =>
      arr.map((entry) => ({ ...entry, otherProp: "otherProp" }))
    );
    const mockWithExtra = {
      sourcePath,
      additionalProp: "additionalProp",
      transforms: transformsWithExtra,
    };
    expect(isCurrentRestore(mockWithExtra)).toBe(true);
  });
});

describe("checkRestoreFile", () => {
  const arg = "someArg";
  const spyOnCurrentRestore = jest.spyOn(restoreUtils, "isCurrentRestore"),
    spyOnLegacyRestore = jest.spyOn(restoreUtils, "isLegacyRestore"),
    spyOnLegacyRestoreMapper = jest.spyOn(restoreUtils, "legacyRestoreMapper");
  let spyOnConsole: SpyInstance<typeof console.log>;
  beforeEach(() => {
    spyOnConsole = jest.spyOn(console, "log").mockImplementation((message?: any) => {});
    jest.clearAllMocks();
  });
  afterAll(() => spyOnConsole.mockRestore());
  it("Should throw an error, if supplied param is not legacy or current restore file", () => {
    [spyOnCurrentRestore, spyOnLegacyRestore].forEach((spy) => spy.mockReturnValueOnce(false));
    expect(() => checkRestoreFile(arg)).toThrowError(incorrectRollbackFormat);
  });
  it("Should return current rollback param directly", () => {
    spyOnCurrentRestore.mockReturnValueOnce(true);
    expect(checkRestoreFile(arg)).toEqual(arg);
    [spyOnLegacyRestore, spyOnConsole, spyOnLegacyRestoreMapper].forEach((spy) =>
      expect(spy).not.toHaveBeenCalled()
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
