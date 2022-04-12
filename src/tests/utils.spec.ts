import process from "process";
import {
  ComposeRenameStringArgs,
  ExtractBaseAndExtTemplate,
} from "../types.js";
import {
  areNewNamesDistinct,
  checkPath,
  composeRenameString,
  determineDir,
  extractBaseAndExt,
  truncateFile,
} from "../converters/utils.js";
import {
  mockFileList,
  expectedSplit,
  examplePath,
  truthyArgument,
  renameListWithIdenticalNewNames,
  renameListWithDistinctNewNames,
} from "./mocks.js";
import fs, { existsSync } from "fs";
import { DEFAULT_SEPARATOR } from "../constants.js";
import { mocked } from "ts-jest/dist/utils/testing";
import { idText } from "typescript";
import { ERRORS } from "../messages/errMessages.js";
import { basename } from "path";

jest.mock("fs");
const mockedFs = jest.mocked(fs, true);

describe("Test utility functions", () => {
  it("extractBaseAndExt should separate the baseName and extension of differently formatted files", () => {
    const extracted = extractBaseAndExt(mockFileList, examplePath);
    extracted.forEach((extractedData, index) => {
      const targetSplit = expectedSplit[index];
      const expected: ExtractBaseAndExtTemplate = {
        baseName: targetSplit[0],
        ext: targetSplit[1],
        sourcePath: examplePath,
      };
      expect(extractedData).toEqual(expected);
    });
  });
  it("determineDir should return truthy argument, otherwise call process.cwd", () => {
    const spyOnCwd = jest
      .spyOn(process, "cwd")
      .mockReturnValueOnce(examplePath);
    expect(determineDir(truthyArgument)).toBe(truthyArgument);
    expect(determineDir(undefined)).toBe(examplePath);
    expect(spyOnCwd).toHaveBeenCalledTimes(1);
  });
  it("areNewNamesDistinct should return false if any of the new names are identical", () => {
    expect(areNewNamesDistinct(renameListWithDistinctNewNames)).toBe(true);
    expect(areNewNamesDistinct(renameListWithIdenticalNewNames)).toBe(false);
  });
});
describe("Test truncateFile", () => {
  const truncateNum = 4;
  const generalArgs = {
    preserveOriginal: true,
    baseName: "baseName",
    truncate: truncateNum.toString(),
  };
  it("Should return baseName, if preserveOriginal is false", () => {
    const args = { ...generalArgs, preserveOriginal: false };
    expect(truncateFile(args)).toBe(args.baseName);
  });
  it("Should throw error, if truncate argument is invalid", async () => {
    const invalidArgs = { ...generalArgs, truncate: "invalid" };
    expect(() => truncateFile(invalidArgs)).toThrowError(
      ERRORS.TRUNCATE_INVALID_ARGUMENT
    );
  });
  it("Should return truncated baseName", ()=> {
    expect(truncateFile(generalArgs).length).toBe(truncateNum);
  })
});
describe("Test composeRenameString", () => {
  const [baseName, ext, customText, newName] = [
    "baseName",
    ".ext",
    "customText",
    "newName",
  ];
  const defaultSep = DEFAULT_SEPARATOR;
  const args: ComposeRenameStringArgs = {
    baseName,
    ext,
    customText,
    newName,
    preserveOriginal: true,
  };
  it("Should return a newName-baseName.extension by default", () => {
    const expected = `${[newName, baseName].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, customText: undefined })).toBe(
      expected
    );
  });
  it("CustomText should override baseName and preserveOriginal", () => {
    const expected = `${[newName, customText].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, preserveOriginal: true })).toBe(
      expected
    );
  });
  it("Should drop original baseName, if preserveOriginal is false|undefined and no customText supplied", () => {
    const expected = `${newName}${ext}`;
    expect(
      composeRenameString({
        ...args,
        customText: undefined,
        preserveOriginal: undefined,
      })
    ).toBe(expected);
    expect(
      composeRenameString({
        ...args,
        customText: undefined,
        preserveOriginal: false,
      })
    ).toBe(expected);
  });
  it("Should return just newName-baseName, if extension is undefined", () => {
    const expected = `${newName}${defaultSep}${baseName}`;
    expect(
      composeRenameString({ ...args, customText: undefined, ext: undefined })
    ).toBe(expected);
  });
  it("Should respect textPosition", () => {
    let expected = `${[customText, newName].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, textPosition: "prepend" })).toBe(
      expected
    );
    expected = `${[newName, customText].join(defaultSep)}${ext}`;
    expect(composeRenameString({ ...args, textPosition: "append" })).toBe(
      expected
    );
  });
  it("Respects separator setting", () => {
    const newSep = "_";
    const expected = `${[newName, customText].join(newSep)}${ext}`;
    expect(composeRenameString({ ...args, separator: newSep })).toBe(expected);
  });
});
