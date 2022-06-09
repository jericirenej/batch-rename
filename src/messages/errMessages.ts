import { VALID_TRANSFORM_TYPES } from "../constants.js";

export const ERRORS = {
  restore: {
    noFilesToConvert: "There are no files available to convert!",
    noRollbackFile:
      "Rollback file not found. Restore to original file names not possible.",
    couldNotBeParsed: "Restore data could not be parsed for any of the files!",
    noValidData: "No valid data was returned from the restoreBaseFunction!",
  },
  cleanRollback: {
    noRollbackFile: "No rollback file exists. Exiting.",
    rollbackOperationFail: "Cleaning up rollback file failed!",
  },
  utils: {
    pathDoesNotExist: "Target path does not exist!",
    pathIsNotDir: "Target path is not a directory!",
    noChildEntries: "Directory has no child entries!",
    noChildFiles:
      "Directory has no children file entries ('files' target type)",
    noChildDirs: "Directory has no child sub-directories ('dirs' target type)",
  },
  transforms: {
    noTransformFunctionAvailable: `No transform function available for the chosen option!`,
    onlyOneUtilAction:
      "Only one type of utility action can be executed at the time!",
    truncateNoPreserveOriginal:
      "Truncate-only transformation cannot be executed if preserveOriginal is set to false!",
    truncateInvalidArgument:
      "Truncate error: passed argument is not a valid number!",
    noTransformationPicked: `No transformation operation picked! Please specify one of the following: ${VALID_TRANSFORM_TYPES.join(
      ", "
    )}`,

    duplicateRenames:
      "Transformation would lead to duplication of file names! Operation aborted.",
  },
};
