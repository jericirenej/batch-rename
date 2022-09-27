import { jest } from "@jest/globals";
import type { SpyInstance } from "jest-mock";
import { nanoid } from "nanoid";
import {
  determineRollbackLevel,
  isCurrentRestore,
  isLegacyRestore,
  legacyRestoreMapper
} from "../converters/restoreUtils";
import { ERRORS, STATUS } from "../messages/index";
import { NewRenameItemList, NewRenameListLevel } from "../types";
import { newRenameList, newRenameListLevel, renameListDistinct } from "./mocks";

const { incorrectRollbackFormat, zeroLevelRollback } = ERRORS.restoreFileMapper;
const { legacyConversion, rollbackLevelOverMax, rollbackLevelsLessThanTarget } =
  STATUS.restoreFileMapper;

jest.mock("nanoid");
const mockedNanoId = jest.mocked(nanoid);

describe("determineRollbackLevel", () => {
  const rollbackLength = 10,
    rollbackList = new Array(rollbackLength).fill(
      newRenameList
    ) as NewRenameItemList[];
  let spyOnConsole: SpyInstance;
  beforeEach(
    () =>
      (spyOnConsole = jest
        .spyOn(console, "log")
        .mockImplementation((message) => {}))
  );
  afterEach(() => spyOnConsole.mockRestore());
  it("Should throw error, if rollback level is 0", () => {
    expect(() =>
      determineRollbackLevel({ rollbackList, rollbackLevel: 0 })
    ).toThrowError(zeroLevelRollback);
  });
  it("Should set restore index to the last array entry (length-1) if rollbackLevel is over maximum", () => {
    expect(
      determineRollbackLevel({
        rollbackList,
        rollbackLevel: rollbackLength + 1,
      })
    ).toBe(rollbackLength);
  });
  it("Should notify the user, if rollbackLevel is over maximum", () => {
    expect(spyOnConsole).not.toHaveBeenCalled();
    determineRollbackLevel({
      rollbackList,
      rollbackLevel: rollbackLength + 1,
    });
    expect(spyOnConsole).toHaveBeenCalledWith(rollbackLevelOverMax);
  });
  it("Should return the target index", () => {
    [1, 2, 3, 5].forEach((rollbackLevel) =>
      expect(
        determineRollbackLevel({
          rollbackList,
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
    expect(isLegacyRestore(newRenameListLevel)).toBe(false);
  });
  it("Should return true for a legacy restore list", () => {
    expect(isLegacyRestore(renameListDistinct)).toBe(true);
  });
});

describe("legacyRestoreMapper", () => {
  it("Should transform legacy rollback files", () => {
    const nanoCode = "nanoCode";
    renameListDistinct.forEach((entry, index) =>
      mockedNanoId.mockReturnValueOnce(`nanoCode-${index}`)
    );
    const mappedResult = legacyRestoreMapper(renameListDistinct);
    const mappedItems: NewRenameItemList[] = [
      renameListDistinct.map(({ original, rename }, index) => ({
        original,
        rename,
        referenceId: `nanoCode-${index}`,
      })),
    ];
    const expected: NewRenameListLevel = {
      sourcePath: renameListDistinct[0].sourcePath,
      transforms: mappedItems,
    };
    expect(mappedResult).toEqual(expected);
  });
});

describe("isCurrentRestore", () => {
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
    expect(isCurrentRestore(newRenameListLevel)).toBe(true));
  it("Should return false for improper top level keys", () => {
    const improperKeys = {
      firstProp: newRenameListLevel.sourcePath,
      someTransformProp: [...newRenameListLevel.transforms],
    };
    expect(isCurrentRestore(improperKeys)).toBe(false);
  });
  it("Should return false if one of the transforms has improper key or non-string value", () => {
    const renameCopy = JSON.parse(
      JSON.stringify(newRenameListLevel)
    ) as NewRenameListLevel;
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
/*
describe("buildRestoreFile", () => {
  it("Should extract all existing files that share the referenceId", () => {});
  it("Should inform user if files have fewer rollbacks than requested", ()=> {})
  it("Should return the expected list with current and earliest names", () => {});
}); */
/* 
describe.only("restoreFileMapper", () => {
  it("Should call determineRollbackLevel", ()=> {});
  it("Should call buildRestoreFile", ()=> {});
  it("Should populate the restoreList with found values", ()=> {});
  it("The order of single rename lists should not matter", ()=> {}); */

/* it("Should run", () => {
    restoreFileMapper({ rollbackFile: newRenameListArray, rollbackLevel: 10 });
  }); 
});*/
