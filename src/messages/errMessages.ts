import { VALID_TRANSFORM_TYPES } from "../constants.js";

export const ERRORS = {
  RESTORE_NO_FILES_TO_CONVERT: "There are no files available to convert!",
  RESTORE_NO_ROLLBACK_FILE_TO_CONVERT:
    "Rollback file not found. Restore to original file names not possible.",
  RESTORE_COULD_NOT_BE_PARSED:
    "Restore data could not be parsed for any of the files!",
  RESTORE_NO_VALID_DATA: "No valid data was returned from the restoreBaseFunction!",
  CLEAN_ROLLBACK_NO_FILE_EXISTS: "No rollback file exists. Exiting.",
  CLEAN_ROLLBACK_CLEANUP_FAIL: "Cleaning up rollback file failed!",
  CHECK_PATH_DOES_NOT_EXIST: "Target path does not exist!",
  CHECK_PATH_NOT_A_DIR:"Target path is not a directory!",
  CHECK_PATH_NO_CHILD_FILES: "Directory has no children file entries",
  DUPLICATE_FILE_NAMES: "Transformation would lead to duplication of file names! Operation aborted.",
  COMMAND_NO_TRANSFORMATION_PICKED: `No transformation operation picked! Please specify one of the following: ${VALID_TRANSFORM_TYPES.join(
    ", "
  )}.`,
  COMMAND_ONLY_ONE_TRANSFORMATION_PERMITTED: "You can only pick one transformation type!",
  COMMAND_ONLY_ONE_UTILITY_ACTION: `Only one type of utility action can be executed at the time!`,

};
