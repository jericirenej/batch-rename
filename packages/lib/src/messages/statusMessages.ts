export const STATUS = {
  /* Dry Run messages */
  dryRunTransformIntro: (transformPattern: string[], transformPath: string): string => {
    return `Transformations of type ${transformPattern.join(
      ", "
    )} in folder ${transformPath} would result in the following transform:`;
  },
  dryRunUnaffectedWarning: (unaffectedFiles: number): string => {
    return `Number of files for which transform has no effect: ${unaffectedFiles}`;
  },

  dryRunDuplicationWarning: (numOfDuplicated: number): string => {
    return `WARNING: Running the transform on these files with the given parameters would result in ${numOfDuplicated} duplicated names and throw an error!`;
  },

  get dryRunWarningOverwrite(): string {
    return "The planned conversion would overwrite files!";
  },
  get dryRunQuestionPerformTransform(): string {
    return "Would you like to execute the previewed transform (N/Y)?";
  },
  get dryRunExitVoidTransform(): string {
    return "No file names would be transformed under the current settings!";
  },
  get dryRunExitWithoutTransform(): string {
    return "Exited application without performing transform.";
  },

  /* Restore messages */
  restoreMessage: (restoreNum: number): string => {
    return `Will revert ${restoreNum} files...`;
  },
  restoreWarningMissingFiles: (missingNum: number): string => {
    return `WARNING: ${missingNum} files were listed in rollback file, but could not be located in target folder.`;
  },
  get questionPerformRestore(): string {
    return "Would you like to execute the restore of} original entry names (N/Y)?";
  },
  get exitWithoutRestore(): string {
    return "Exited application without performing restore.";
  },

  /* Restore file mapper */
  get rollbackLevelOverMax(): string {
    return "Specified rollback level is higher than the combined number of stored batch operations. Will map to initial entry.";
  },
  rollbackLevelsLessThanTarget: (filesWithLessLevels: number, allFiles: number): string => {
    const endMessage = "Will rollback to the earliest possible version.";
    if (filesWithLessLevels === allFiles) {
      return `All files have less rollback levels than requested. ${endMessage}`;
    }
    return `${filesWithLessLevels} number of files have less rollback levels than requested. ${endMessage}`;
  },
  get legacyConversion(): string {
    return "Legacy rollback file format found. Will be converted to current format.";
  },

  /* Settled promises eval */
  failReport: (promisesRejected: number, operationType: "convert" | "restore"): string => {
    return `${promisesRejected} ${operationType} operations were unsuccessful:`;
  },

  failItem: (original: string, rename: string, operationType: "convert" | "restore"): string => {
    const renameOrder =
      operationType === "convert" ? `${original} => ${rename}` : `${rename} => ${original}`;
    return `${operationType}: ${renameOrder}`;
  },
};
