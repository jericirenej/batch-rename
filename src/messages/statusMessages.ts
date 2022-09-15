export const STATUS = {
  dryRun: {
    transformIntro(transformPattern: string[], transformPath: string): string {
      return `Transformations of type ${transformPattern.join(
        ", "
      )} in folder ${transformPath} would result in the following transform:`;
    },
    warningUnaffectedFiles(unaffectedFiles: number) {
      return `Number of files for which transform has no effect: ${unaffectedFiles}`;
    },
    warningDuplication(numOfDuplicated: number) {
      return `WARNING: Running the transform on these files with the given parameters would result in ${numOfDuplicated} duplicated names and throw an error!`;
    },
    questionPerformTransform:
      "Would you like to execute the previewed transform (N/Y)?",
    exitVoidTransform:
      "No file names would be transformed under the current settings!",
    exitWithoutTransform: "Exited application without performing transform.",
  },
  restore: {
    restoreMessage(restoreNum: number): string {
      return `Will revert ${restoreNum} files...`;
    },
    warningMissingFiles(missingNum: number): string {
      return `WARNING: ${missingNum} files were listed in rollback file, but could not be located in target folder.`;
    },
    questionPerformRestore:
      "Would you like to execute the restore of original entry names (N/Y)?",
    exitWithoutRestore: "Exited application without performing restore.",
  },
  restoreFileMapper: {
    rollbackLevelOverMax: "Specified rollback level is higher than the combined number of stored batch operations. Will map to initial entry.",
  },
  settledPromisesEval: {
    failReport: (
      promisesRejected: number,
      operationType: "convert" | "restore"
    ) => `${promisesRejected} ${operationType} operations were unsuccessful:`,
    failItem: (
      original: string,
      rename: string,
      operationType: "convert" | "restore"
    ) => {
      const renameOrder =
        operationType === "convert"
          ? `${original} => ${rename}`
          : `${rename} => ${original}`;
      return `${operationType}: ${renameOrder}`;
    },
  },
};
