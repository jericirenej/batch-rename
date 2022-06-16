import { STATUS } from "../messages/statusMessages.js";

describe("Status messages methods", () => {
  const expectedNum = 10, transformPatterns = ["pattern1", "pattern2"], folderPath = "folderPath";

  describe("dryRun methods", () => {
    const { dryRun } = STATUS;
    it("transformIntro should return expected string", () => {
      const expected = `Transformations of type ${transformPatterns.join(", ")} in folder ${folderPath} would result in the following transform:`;
      expect(
        dryRun.transformIntro(
          transformPatterns,
          folderPath
        )
      ).toBe(expected);
    });
    it("warningUnaffectedFiles should return expected string", () => {
      const expected = `Number of files for which transform has no effect: ${expectedNum}`;
      expect(dryRun.warningUnaffectedFiles(expectedNum)).toBe(expected);
    });
    it("warningDuplication should return expected string", () => {
      const expected = `WARNING: Running the transform on these files with the given parameters would result in ${expectedNum} duplicated names and throw an error!`;
      expect(dryRun.warningDuplication(expectedNum)).toBe(expected);
    });
  });
  describe("restore methods", ()=> {
    const {restore}=STATUS;
    it("restoreMessage should return expected string", ()=> {
      const expected = `Will revert ${expectedNum} files...`;
      expect(restore.restoreMessage(expectedNum)).toBe(expected);
    });
    it("warningMIssingFiles should return expected string", ()=> {
      const expected = `WARNING: ${expectedNum} files were listed in rollback file, but could not be located in target folder.`
      expect(restore.warningMissingFiles(expectedNum)).toBe(expected);
    })
  })
});
