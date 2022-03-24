import { restoreOriginalFileNames } from "./converters/restorePoint.js";
import { cleanUpRollbackFile } from "./converters/utils.js";

export const DEFAULT_SEPARATOR = "-";
export const ROLLBACK_FILE_NAME = ".rollback.json";
export const VALID_TRANSFORM_TYPES = [
  "numericTransform",
  "dateRename",
  "searchAndReplace",
] as const;
export const VALID_DATE_TRANSFORM_TYPES = [
  "creationDate",
  "lastAccessed",
  "lastModified",
] as const;

export const VALID_NUMERIC_TRANSFORM_TYPES = ["sequence", "even", "odd"] as const;
export const UTILITY_ACTIONS = ["restore", "cleanRollback"] as const;
export const PROGRAM_VERSION = "1.0.0.";
export const utilityActionsCorrespondenceTable = {
  restore: restoreOriginalFileNames,
  cleanRollback: cleanUpRollbackFile,
};
