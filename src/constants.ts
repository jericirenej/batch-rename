
export const DEFAULT_SEPARATOR = "-";
export const ROLLBACK_FILE_NAME = ".rollback.json";
export const VALID_TRANSFORM_TYPES = [
  "numericTransform",
  "dateRename",
  "searchAndReplace",
  "truncate",
  "addText",
  "extensionModify",
  "format",
] as const;

export const VALID_DATE_TRANSFORM_TYPES = [
  "creationDate",
  "lastAccessed",
  "lastModified",
] as const;

export const EXT_REGEX = /(?<=[\p{Alphabetic}\p{Decimal_Number}-]+)(\.\w+)$/u;

export const VALID_NUMERIC_TRANSFORM_TYPES = [
  "sequence",
  "even",
  "odd",
] as const;
export const UTILITY_ACTIONS = ["restore", "cleanRollback"] as const;
export const PROGRAM_VERSION = "1.0.0.";
