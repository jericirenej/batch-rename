export const DEFAULT_SEPARATOR = "-";
export const ROLLBACK_FILE_NAME = ".rollback.json";
export const VALID_TRANSFORM_TYPES = [
  "numericTransform",
  "dateRename",
  "searchAndReplace",
  "truncate",
] as const;

export const INCLUSIVE_TRANSFORM_TYPES = ["truncate"] as const;
export const EXCLUSIVE_TRANSFORM_TYPES = VALID_TRANSFORM_TYPES.filter(
  (transformType) =>
    !INCLUSIVE_TRANSFORM_TYPES.some(
      (inclusiveType) => inclusiveType === transformType
    )
);
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
