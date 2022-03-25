import process from "process";
import { ExtractBaseAndExtTemplate } from "../types.js";
import {
  areNewNamesDistinct,
  checkPath,
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
  it("areNewNamesDistinct should return false if any of the new names are identical", ()=> {
    expect(areNewNamesDistinct(renameListWithDistinctNewNames)).toBe(true);
    expect(areNewNamesDistinct(renameListWithIdenticalNewNames)).toBe(false);
  })
  /* describe.skip("Test checkPath", () => {
    // afterEach(()=> jest.resetAllMocks());
    it("Should throw error, if provided path doesn't exist", async () => {
      mockedFs.existsSync.mockReturnValueOnce(false);

      await expect(()=> checkPath(process.cwd())).rejects.toThrow();
    });
  }); */
});
