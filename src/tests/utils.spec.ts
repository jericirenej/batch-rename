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
  describe.only("Test composeRenameString", () => {
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
    it("Respects separator setting", ()=> {
      const newSep = "_";
      const expected = `${[newName, customText].join(newSep)}${ext}`;
      expect(composeRenameString({...args, separator: newSep})).toBe(expected);
    });
  });
  /* describe.skip("Test checkPath", () => {
    // afterEach(()=> jest.resetAllMocks());
    it("Should throw error, if provided path doesn't exist", async () => {
      mockedFs.existsSync.mockReturnValueOnce(false);

      await expect(()=> checkPath(process.cwd())).rejects.toThrow();
    });
  }); */
});
