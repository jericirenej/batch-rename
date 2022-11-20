import { jest } from "@jest/globals";
import type { SpyInstance } from "jest-mock";
import { nanoid } from "nanoid";
import { ERRORS, STATUS } from "../messages/index.js";
import { ConversionList, RenameItemsArray, RollbackFile } from "../types.js";
import * as restoreUtils from "../utils/restoreUtils.js";
import {
  checkFilesExistingMock,
  checkFilesTransforms,
  currentRenameList,
  examplePath as sourcePath,
  newRollbackFile,
  renameListDistinct
} from "./mocks.js";

const {
  buildRestoreFile,
  checkExistingFiles,
  checkRestoreFile,
  determineRollbackLevel,
  isCurrentRestore,
  isLegacyRestore,
  legacyRestoreMapper,
  restoreFileMapper,
} = restoreUtils;

const { incorrectRollbackFormat, zeroLevelRollback } = ERRORS.restoreFileMapper;
const { legacyConversion, rollbackLevelOverMax } = STATUS.restoreFileMapper;

jest.mock("nanoid");
const mockedNanoId = jest.mocked(nanoid);

const renameSequence = (baseName: string, length: number) =>
  new Array(length)
    .fill(0)
    .map((entry, index) => `${length - index}-${baseName}`);

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
  it("Should throw error, if rollback level is 0", () => {
    expect(() =>
      determineRollbackLevel({ transformList, rollbackLevel: 0 })
    ).toThrowError(zeroLevelRollback);
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
    expect(isLegacyRestore(newRollbackFile)).toBe(false);
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
    expect(isCurrentRestore(newRollbackFile)).toBe(true));
  it("Should return false for improper top level keys", () => {
    const improperKeys = {
      firstProp: newRollbackFile.sourcePath,
      someTransformProp: [...newRollbackFile.transforms],
    };
    expect(isCurrentRestore(improperKeys)).toBe(false);
  });
  it("Should return false if one of the transforms has improper key or non-string value", () => {
    const renameCopy = JSON.parse(
      JSON.stringify(newRollbackFile)
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

describe("buildRestoreFile", () => {
  let spyOnConsole: SpyInstance<typeof console.log>,
    spyOnTable: SpyInstance<typeof console.table>;
  const restoreChain = 5,
    targetLevel = restoreChain - 1,
    refId1 = "refId1",
    refId2 = "refId2";
  const restoreList: Record<string, string[]> = {
    [refId1]: renameSequence(refId1, restoreChain),
    [refId2]: renameSequence(refId2, restoreChain),
  };
  beforeEach(() => {
    spyOnConsole = jest
      .spyOn(console, "log")
      .mockImplementation((message?: any) => {});
    spyOnTable = jest
      .spyOn(console, "table")
      .mockImplementation(
        (tabularData: any, properties?: readonly string[]) => {}
      );
    jest.clearAllMocks();
  });
  afterAll(() => {
    spyOnConsole.mockRestore();
    spyOnTable.mockRestore();
  });

  it("Should produce a restore list", () => {
    const expected: ConversionList = {
      sourcePath,
      transforms: [refId1, refId2].map((entry) => ({
        rename: `5-${entry}`,
        original: `1-${entry}`,
        referenceId: entry,
        numberOfRollbacks: restoreChain,
      })),
    };

    const result = buildRestoreFile({
      restoreList,
      sourcePath,
      targetLevel,
    });
    expect(result).toEqual(expected);
  });
  describe("Handling of restore chains with elements that have fewer levels than requested", () => {
    const newConversionList = JSON.parse(JSON.stringify(restoreList)) as Record<
      string,
      string[]
    >;

    newConversionList[refId2] = newConversionList[refId2].slice(0, -2);
    it("Should produce a restore list with latest available rollbacks", () => {
      const expected: ConversionList = {
        sourcePath,
        transforms: [refId1, refId2].map((entry) => ({
          rename: `5-${entry}`,
          original: `${entry === refId1 ? 1 : 3}-${entry}`,
          referenceId: entry,
          numberOfRollbacks: entry === refId1 ? restoreChain : restoreChain - 2,
        })),
      };
      const result = buildRestoreFile({
        restoreList: newConversionList,
        sourcePath,
        targetLevel,
      });
      expect(result).toEqual(expected);
    });
    it("Should inform the user that some files have less rollback levels", () => {
      buildRestoreFile({ restoreList, sourcePath, targetLevel });
      [spyOnConsole, spyOnTable].forEach((spy) =>
        expect(spy).not.toHaveBeenCalled()
      );
      buildRestoreFile({
        restoreList: newConversionList,
        sourcePath,
        targetLevel,
      });
      [spyOnConsole, spyOnTable].forEach((spy) =>
        expect(spy).toHaveBeenCalled()
      );
    });
  });
});

describe("restoreFileMapper", () => {
  const args = { rollbackFile: newRollbackFile };
  it("Should call determineRollbackLevel", () => {
    const spyOnDetermineRollback = jest.spyOn(
      restoreUtils,
      "determineRollbackLevel"
    );
    restoreFileMapper(args);
    expect(spyOnDetermineRollback).toHaveBeenCalledTimes(1);
  });
  it("Should call buildRestoreFile", () => {
    const spyOnBuildRestoreFile = jest.spyOn(restoreUtils, "buildRestoreFile");
    restoreFileMapper(args);
    expect(spyOnBuildRestoreFile).toHaveBeenCalledTimes(1);
  });
  it("Should call buildRestoreFile with appropriate args", () => {
    const spyOnConsole = jest
      .spyOn(console, "log")
      .mockImplementationOnce((message?: any) => {});
    const spyOnBuildRestoreFile = jest.spyOn(restoreUtils, "buildRestoreFile");
    const { transforms } = newRollbackFile;
    const targetLevel = transforms.length,
      sourcePath = newRollbackFile.sourcePath;
    const restoreList = {} as Record<string, string[]>;
    [3, 2, 1].forEach((entry) => {
      const propName = `000${entry}`;
      restoreList[propName] = [
        `thirdRename${entry}`,
        `secondRename${entry}`,
        `rename${entry}`,
        `original${entry}`,
      ];
    });
    restoreFileMapper({ ...args, rollbackLevel: Infinity });
    expect(spyOnBuildRestoreFile).toHaveBeenCalledWith({
      restoreList,
      targetLevel,
      sourcePath,
    });
  });
});

