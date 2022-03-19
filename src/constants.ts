import { cleanUpRollbackFile } from "./converter/converter.js";
import { restoreOriginalFileNames } from "./converter/restorePoint.js";

export const MIN_NUMBER_LENGTH = 4;
export const ROLLBACK_FILE_NAME = ".rollback.json";
export const VALID_TRANSFORM_TYPES = [
  "even",
  "odd",
  "dateRename",
  "searchAndReplace",
] as const;
export const VALID_DATE_TRANSFORM_TYPES = [
  "creationDate",
  "lastAccessed",
  "lastModified",
] as const;
export const UTILITY_ACTIONS = ["restore", "cleanRollback"] as const;
export const PROGRAM_VERSION = "1.0.0.";
export const utilityActionsCorrespondenceTable = {
  restore: restoreOriginalFileNames,
  cleanRollback: cleanUpRollbackFile,
};
