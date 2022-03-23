import { ExtractBaseAndExtTemplate } from "../types.js";
import { extractBaseAndExt } from "../converters/utils.js";
import { mockFileList, expectedSplit, examplePath } from "./mocks.js";

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
});
