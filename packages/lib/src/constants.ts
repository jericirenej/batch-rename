export const DEFAULT_SEPARATOR = "-";
export const DEFAULT_TARGET_TYPE = "files";
export const ROLLBACK_FILE_NAME = ".rollback.json";
export const VALID_TRANSFORM_TYPES = [
  "numericTransform",
  "dateRename",
  "searchAndReplace",
  "keep",
  "truncate",
  "addText",
  "extensionModify",
  "format",
  "omit",
] as const;

export const VALID_DATE_TRANSFORM_TYPES = ["creationDate", "lastAccessed", "lastModified"] as const;

// eslint-disable-next-line no-useless-escape
export const EXT_REGEX = /(?<=[\[\]\(\)\p{Alphabetic}\p{Decimal_Number}\p{Mark}-]+)(\.\w+)$/u;

export const VALID_NUMERIC_TRANSFORM_TYPES = ["sequence", "even", "odd"] as const;

export const VALID_DRY_RUN_ANSWERS = ["y", "yes"];
export const UTILITY_ACTIONS = ["restore", "cleanRollback"] as const;

export const EXCLUDED_CONVERT_OPTIONS = ["target", "restArgs"];
export const PROGRAM_VERSION = "1.0.0.";
