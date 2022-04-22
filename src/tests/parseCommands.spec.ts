import program from "../commands/generateCommands.js";
import * as parseCommands from "../commands/parseCommands.js";
import {
  EXCLUSIVE_TRANSFORM_TYPES,
  INCLUSIVE_TRANSFORM_TYPES,
} from "../constants.js";
import * as converters from "../converters/converter.js";
import * as utils from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import type { OptionKeysWithValues } from "../types.js";
import { examplePath } from "./mocks.js";

const {
  parseOptions,
  setTransformationPath,
  utilityActionsCheck,
  transformationCheck,
} = parseCommands;
const spyOnProgramHelp = jest.spyOn(program, "help"),
  spyOnConvertFiles = jest.spyOn(converters, "convertFiles"),
  spyOnUtilityActionsCheck = jest.spyOn(parseCommands, "utilityActionsCheck"),
  spyOnSetTransformationPath = jest.spyOn(
    parseCommands,
    "setTransformationPath"
  );

describe("utilityActionsCheck", () => {
  const utilityActionsList = {
    cleanRollback: true,
    restore: true,
    baseIndex: "0",
  } as OptionKeysWithValues;
  it("Should throw error, if more than one utility actions is chosen", () => {
    expect(() => utilityActionsCheck(utilityActionsList)).toThrow();
  });
  it("Should return utility action, if it exists", () => {
    [
      {
        args: { cleanRollback: true, baseIndex: "0" },
        expected: "cleanRollback",
      },
      {
        args: { restore: true, baseIndex: "0" },
        expected: "restore",
      },
      {
        args: { baseIndex: "0" },
        expected: undefined,
      },
    ].forEach((argConfig) => {
      const result = utilityActionsCheck(argConfig.args);
      expect(result).toBe(argConfig.expected);
    });
  });
});

describe("setTransformationPath", () => {
  const [folderPath, restArgs] = ["folderPath", ["restArg1", "restArg2"]];
  let spyOnCheckPath: jest.SpyInstance;
  beforeEach(() => {
    spyOnCheckPath = jest.spyOn(utils, "checkPath");
  });
  afterEach(() => spyOnCheckPath.mockRestore());
  it("Should call and return checkPath with folderPath, if latter provided", async () => {
    spyOnCheckPath.mockResolvedValueOnce(examplePath);
    const result = await setTransformationPath(folderPath, restArgs);
    expect(result).toBe(examplePath);
    expect(spyOnCheckPath).toHaveBeenCalledTimes(1);
    expect(spyOnCheckPath).toHaveBeenCalledWith(folderPath);
  });
  it("Should call and return checkPath with first restArg, if provided", async () => {
    spyOnCheckPath.mockResolvedValueOnce(examplePath);
    const result = await setTransformationPath(undefined, restArgs);
    expect(result).toBe(examplePath);
    expect(spyOnCheckPath).toHaveBeenCalledTimes(1);
    expect(spyOnCheckPath).toHaveBeenCalledWith(restArgs[0]);
  });
  it("Should return undefined if no folder path or an undefine|empty restArgs array is provided", async () => {
    spyOnCheckPath.mockResolvedValueOnce(examplePath);
    [
      [undefined, []],
      [undefined, undefined],
    ].forEach(async (argConfiguration) => {
      const [folderPath, restArgs] = [argConfiguration[0], argConfiguration[1]];
      const result = await setTransformationPath(
        folderPath as unknown as string,
        restArgs
      );
      expect(result).toBe(undefined);
      expect(spyOnCheckPath).not.toHaveBeenCalled();
    });
  });
});

describe("transformationCheck", () => {
  const exampleArg = { preserveOriginal: true } as OptionKeysWithValues;
  const inclusiveTypes: Partial<OptionKeysWithValues> = {};
  const exclusiveTypes: Partial<OptionKeysWithValues> = {};
  INCLUSIVE_TRANSFORM_TYPES.forEach((type) => (inclusiveTypes[type] = true));
  EXCLUSIVE_TRANSFORM_TYPES.forEach((type) => (exclusiveTypes[type] = true));

  it("Should throw error if no transformation picked", () => {
    expect(() => transformationCheck(exampleArg)).toThrowError(
      ERRORS.COMMAND_NO_TRANSFORMATION_PICKED
    );
  });
  it("Should throw error, if two exclusive transformation types are picked", () => {
    expect(() =>
      transformationCheck({ ...exampleArg, ...exclusiveTypes })
    ).toThrowError(ERRORS.COMMAND_ONLY_ONE_EXCLUSIVE_TRANSFORM);
  });
  it("Should return a list of picked transformations", () => {
    const variants = [
      {
        [EXCLUSIVE_TRANSFORM_TYPES[0]]:
          exclusiveTypes[EXCLUSIVE_TRANSFORM_TYPES[0]]!,
      },
      {
        [EXCLUSIVE_TRANSFORM_TYPES[0]]:
          exclusiveTypes[EXCLUSIVE_TRANSFORM_TYPES[0]]!,
        [INCLUSIVE_TRANSFORM_TYPES[0]]:
          inclusiveTypes[INCLUSIVE_TRANSFORM_TYPES[0]]!,
      },
    ];
    console.log(variants);
    variants.forEach((variant) => {
      const expected = Object.keys(variant);
      const result = transformationCheck({ ...exampleArg, ...variant });
      expect(result).toEqual(expected);
    });
  });
});
