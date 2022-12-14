import process from "process";
import program from "../commands/generateCommands.js";
import * as parseCommands from "../commands/parseCommands.js";
import {
  EXCLUDED_CONVERT_OPTIONS,
  VALID_TRANSFORM_TYPES
} from "../constants.js";
import * as converters from "../converters/converter.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  OptionKeysWithValues,
  OptionKeysWithValuesAndRestArgs
} from "../types.js";
import * as utils from "../utils/utils.js";
import { examplePath } from "./mocks.js";

const {
  parseOptions,
  setTransformationPath,
  utilityActionsCheck,
  transformationCheck,
} = parseCommands;
const spyOnProgramHelp = jest.spyOn(program, "help"),
  spyOnProcessExit = jest.spyOn(process, "exit"),
  spyOnConvertFiles = jest.spyOn(converters, "convertFiles"),
  spyOnUtilityActionsCheck = jest.spyOn(parseCommands, "utilityActionsCheck"),
  spyOnSetTransformationPath = jest.spyOn(
    parseCommands,
    "setTransformationPath"
  ),
  spyOnTransformationCheck = jest.spyOn(parseCommands, "transformationCheck");

describe("parseOptions", () => {
  const spyOnConsoleError = jest.spyOn(console, "error");
  const exampleArgs = {
    preserveOriginal: true,
    addText: false,
    numericTransform: true,
    target: examplePath,
  } as OptionKeysWithValuesAndRestArgs;
  beforeEach(() => {
    spyOnSetTransformationPath.mockResolvedValue(examplePath);
    spyOnUtilityActionsCheck.mockReturnValue(undefined);
    spyOnTransformationCheck.mockReturnValue(["numericTransform"]);
    spyOnConvertFiles.mockResolvedValue();
    spyOnConsoleError.mockImplementation();
  });
  afterEach(() => jest.clearAllMocks());
  afterAll(() => {
    jest.resetAllMocks();
    spyOnConsoleError.mockRestore();
  });
  it("Should call program help, if no arguments are supplied", async () => {
    const spyOnProcessStdOut = jest
      .spyOn(process.stdout, "write")
      .mockImplementation();
    program.exitOverride();

    spyOnProcessExit.mockImplementationOnce((code?: number) => {
      throw new Error(code ? code.toString() : undefined);
    });
    await expect(() =>
      parseOptions({} as OptionKeysWithValuesAndRestArgs)
    ).rejects.toThrow();
    expect(spyOnProgramHelp).toHaveBeenCalled();
    spyOnProcessExit.mockRestore();
    spyOnProcessStdOut.mockRestore();
  });
  it("Should call appropriate methods", async () => {
    program.exitOverride();
    await parseOptions(exampleArgs);
    [
      spyOnSetTransformationPath,
      spyOnUtilityActionsCheck,
      spyOnTransformationCheck,
      spyOnConvertFiles,
    ].forEach((method) => expect(method).toHaveBeenCalledTimes(1));
  });
  it("If evaluating preserveOriginal fails, preserveOriginal should be set to true", async () => {
    const spyOnToLowerCase = jest
      .spyOn(String.prototype, "toLowerCase")
      .mockImplementationOnce(() => {
        throw new TypeError();
      });

    await parseOptions({
      ...exampleArgs,
      preserveOriginal: undefined as unknown as string,
    });
    const preserveOriginal =
      spyOnConvertFiles.mock.calls.flat()[0].preserveOriginal;
    expect(preserveOriginal).toBe(true);
    spyOnToLowerCase.mockRestore();
  });
  it("Should set dryRun to false only if explicitly stated", async () => {
    const testCases = [
      { val: undefined, expected: true },
      { val: "true", expected: true },
      { val: "false", expected: false },
    ];
    for (const { val, expected } of testCases) {
      if (val === undefined) {
        await parseOptions({ ...exampleArgs });
      } else {
        await parseOptions({ ...exampleArgs, dryRun: val });
      }
      const dryRunArg = spyOnConvertFiles.mock.calls.flat().at(-1)?.dryRun;
      expect(dryRunArg).toBe(expected);
    }
  });
  it("Should set skipRollback to true only if explicitly stated", async () => {
    const testCases = [
      { val: undefined, expected: false },
      { val: "false", expected: false },
      { val: "true", expected: true },
    ];
    for (const { val, expected } of testCases) {
      if (val === undefined) {
        await parseOptions({ ...exampleArgs });
      } else {
        await parseOptions({ ...exampleArgs, skipRollback: val });
      }
      const skipRollbackArg = spyOnConvertFiles.mock.calls
        .flat()
        .at(-1)?.skipRollback;
      expect(skipRollbackArg).toBe(expected);
    }
  });
  it("Should properly evaluate a stringified preserveOriginal argument", async () => {
    spyOnConvertFiles.mockClear();
    [
      { value: "true", expected: true },
      { value: "false", expected: false },
      { value: "TrUe", expected: true },
      { value: "fAlSe", expected: false },
    ].forEach(async (preserveConfig, index) => {
      const { value, expected } = preserveConfig;
      await parseOptions({ ...exampleArgs, preserveOriginal: value });
      const preserveOriginal =
        spyOnConvertFiles.mock.calls.flat()[index].preserveOriginal;
      expect(preserveOriginal).toBe(expected);
    });
  });
  it("Should pass appropriately shaped object to converter", async () => {
    const argList: OptionKeysWithValuesAndRestArgs[] = [
      exampleArgs,
      { ...exampleArgs, noExtensionPreserve: true, detailedDate: true },
      { ...exampleArgs, format: "uppercase" },
    ];
    const extraKeys = [
      "transformPattern",
      "transformPath",
      "dryRun",
      "skipRollback",
    ];
    argList.forEach(async (args) => {
      spyOnConvertFiles.mockClear();
      await parseOptions(args);
      const expectedKeys = extraKeys.concat(
        Object.keys(args).filter(
          (arg) => !EXCLUDED_CONVERT_OPTIONS.includes(arg)
        )
      );
      const receivedKeys = Object.keys(spyOnConvertFiles.mock.calls.flat()[0]);
      expect(receivedKeys.every((key) => expectedKeys.includes(key))).toBe(
        true
      );
    });
  });
});

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
  const [folder, restArgs] = ["folder", ["restArg1", "restArg2"]];
  let spyOnCheckPath: jest.SpyInstance;
  beforeEach(() => {
    spyOnCheckPath = jest.spyOn(utils, "checkPath");
  });
  afterEach(() => spyOnCheckPath.mockRestore());
  it("Should call and return checkPath with folder, if latter provided", async () => {
    spyOnCheckPath.mockResolvedValueOnce(examplePath);
    const result = await setTransformationPath(folder, restArgs);
    expect(result).toBe(examplePath);
    expect(spyOnCheckPath).toHaveBeenCalledTimes(1);
    expect(spyOnCheckPath).toHaveBeenCalledWith(folder);
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
      const [folder, restArgs] = [argConfiguration[0], argConfiguration[1]];
      const result = await setTransformationPath(
        folder as unknown as string,
        restArgs
      );
      expect(result).toBe(undefined);
      expect(spyOnCheckPath).not.toHaveBeenCalled();
    });
  });
});

describe("transformationCheck", () => {
  const exampleArg = { preserveOriginal: true } as OptionKeysWithValues;
  it("Should throw error if no transformation picked", () => {
    expect(() => transformationCheck(exampleArg)).toThrowError(
      ERRORS.transforms.noTransformationPicked
    );
  });
  it("Should return a list of picked transformations", () => {
    const variants = [
      { dateRename: true, truncate: true },
      { addText: true, truncate: true, numericTransform: true },
      { someOtherProp: true, numericTransform: true, anotherOther: true },
    ];
    variants.forEach((variant) => {
      const expected = Object.keys(variant).filter((variant) =>
        VALID_TRANSFORM_TYPES.some((transformType) => transformType === variant)
      );
      const result = transformationCheck({ ...exampleArg, ...variant });
      expect(result).toEqual(expected);
    });
  });
});
