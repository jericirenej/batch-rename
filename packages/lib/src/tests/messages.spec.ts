import { STATUS } from "../messages/statusMessages.js";

describe("Status messages methods", () => {
  const expectedNum = 10,
    transformPatterns = ["pattern1", "pattern2"],
    folderPath = "folderPath";

  describe("dryRun methods", () => {
    const { dryRunTransformIntro, dryRunUnaffectedWarning, dryRunDuplicationWarning } = STATUS;
    it("transformIntro should return expected string", () => {
      const expected = `Transformations of type ${transformPatterns.join(
        ", "
      )} in folder ${folderPath} would result in the following transform:`;
      expect(dryRunTransformIntro(transformPatterns, folderPath)).toBe(
        expected
      );
    });
    it("warningUnaffectedFiles should return expected string", () => {
      const expected = `Number of files for which transform has no effect: ${expectedNum}`;
      expect(dryRunUnaffectedWarning(expectedNum)).toBe(expected);
    });
    it("warningDuplication should return expected string", () => {
      const expected = `WARNING: Running the transform on these files with the given parameters would result in ${expectedNum} duplicated names and throw an error!`;
      expect(dryRunDuplicationWarning(expectedNum)).toBe(expected);
    });
  });
  describe("restore methods", () => {
    const { restoreMessage, restoreWarningMissingFiles, rollbackLevelsLessThanTarget } = STATUS;
    it("restoreMessage should return expected string", () => {
      const expected = `Will revert ${expectedNum} files...`;
      expect(restoreMessage(expectedNum)).toBe(expected);
    });
    it("warningMissingFiles should return expected string", () => {
      const expected = `WARNING: ${expectedNum} files were listed in rollback file, but could not be located in target folder.`;
      expect(restoreWarningMissingFiles(expectedNum)).toBe(expected);
    });
    it("rollbackLevelsLessThanTarget", () => {
      const allFiles = 10;
      for (const filesWithLess of [3, 5, 10]) {
        const result = rollbackLevelsLessThanTarget(
          filesWithLess,
          allFiles
        );
        const index = result.indexOf(`${filesWithLess}`);
        if (filesWithLess === allFiles) {
          expect(index === -1).toBe(true);
        } else {
          expect(index > -1).toBe(true);
        }
      }
    });
  });
});
