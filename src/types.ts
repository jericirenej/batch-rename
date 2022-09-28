import { Dirent, Stats } from "fs";
import {
  UTILITY_ACTIONS,
  VALID_DATE_TRANSFORM_TYPES,
  VALID_NUMERIC_TRANSFORM_TYPES,
  VALID_TRANSFORM_TYPES
} from "./constants";

export type ValidTypes = "files" | "dirs" | "all";

export type ValidTextFormats = "uppercase" | "lowercase" | "capitalize";
export type OptionKeys =
  | "preserveOriginal"
  | "noExtensionPreserve"
  | "restore"
  | "dryRun"
  | "cleanRollback"
  | "addText"
  | "dateRename"
  | "textPosition"
  | "searchAndReplace"
  | "keep"
  | "detailedDate"
  | "target"
  | "numericTransform"
  | "separator"
  | "truncate"
  | "baseIndex"
  | "exclude"
  | "extensionModify"
  | "format"
  | "targetType";

export type OptionKeysWithValues = Record<
  OptionKeys,
  boolean | string | string[]
>;

export type OptionKeysWithValuesAndRestArgs = OptionKeysWithValues & {
  restArgs?: string[];
};

export type SetTransformationPath = (
  folder: string | undefined,
  restArgs: string[] | undefined
) => Promise<string | undefined>;

export type TransformTypes = typeof VALID_TRANSFORM_TYPES[number];
export type ExtractBaseAndExtTemplate = {
  baseName: string;
  ext: string;
  sourcePath: string;
  type: "directory" | "file";
};
export type ExtractBaseAndExtReturn = ExtractBaseAndExtTemplate[];
export type FileListWithStats = ExtractBaseAndExtTemplate & {
  stats: Stats;
};

export type FormattedDate = {
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds: string;
};
export type FileListWithStatsArray = FileListWithStats[];
export type FileListWithDates = ExtractBaseAndExtTemplate & {
  formattedDate: FormattedDate;
};

export type ProvideFileStats = (
  splitFileList: ExtractBaseAndExtReturn
) => Promise<FileListWithStatsArray>;

export type ExtractBaseAndExt = (
  fileList: Dirent[],
  sourcePath: string
) => ExtractBaseAndExtReturn;

export interface LegacyRenameItem {
  rename: string;
  original: string;
  sourcePath: string;
}
export type LegacyRenameList = LegacyRenameItem[];
export type RenameListArgs = {
  transformPattern: TransformTypes[];
  addText?: string;
  textPosition?: "append" | "prepend";
  preserveOriginal?: boolean;
  noExtensionPreserve?: boolean;
  extensionModify?: string;
  dateRename?: DateTransformOptions;
  detailedDate?: boolean;
  dryRun?: boolean;
  searchAndReplace?: string[];
  transformPath?: string;
  numericTransform?: typeof VALID_NUMERIC_TRANSFORM_TYPES[number];
  separator?: string;
  truncate?: string;
  baseIndex?: string;
  exclude?: string;
  format?: ValidTextFormats;
  targetType?: ValidTypes;
  keep?: string;
};
export type GenerateRenameListArgs = RenameListArgs & {
  splitFileList: ExtractBaseAndExtReturn | FileListWithStatsArray;
};
export type GenerateRenameList = (args: GenerateRenameListArgs) => LegacyRenameList;

export type DryRunTransformArgs = {
  transformedNames: LegacyRenameList;
  transformPattern: TransformTypes[];
  transformPath: string;
};
export type DryRunTransform = (args: DryRunTransformArgs) => Promise<boolean>;

export type DryRunRestore = (args: RestoreBaseReturn) => Promise<boolean>;

export type GeneralTransformReturn = {
  rename: string;
  original: string;
  sourcePath: string;
}[];

export type NumericTransform = (
  args: GenerateRenameListArgs
) => GeneralTransformReturn;

export type DateTransform = (
  args: GenerateRenameListArgs
) => GeneralTransformReturn;

export type DateTransformOptions = typeof VALID_DATE_TRANSFORM_TYPES[number];
export type DateTransformTypes = {
  type: DateTransformOptions;
  fileList: FileListWithStats;
};

export type DateTransformCorrespondenceTable = Record<
  DateTransformOptions,
  keyof Stats
>;

export type SearchAndReplaceArgs = { filter: RegExp | null; replace: string };
export type GenerateSearchAndReplaceArgs = (
  args: string[]
) => SearchAndReplaceArgs;

export type SearchAndReplace = (args: GenerateRenameListArgs) => LegacyRenameList;

export type TruncateFileNameArgs = {
  preserveOriginal: boolean;
  baseName: string;
  truncate: string;
  format?: string;
};
export type TruncateFileName = (args: TruncateFileNameArgs) => string;
export type TruncateTransform = (args: GenerateRenameListArgs) => LegacyRenameList;

export type AddTextTransform = TruncateTransform;

export type ExtensionModifyTransform = TruncateTransform;

export type ProgramOptions = {
  short: string;
  long: OptionKeys;
  description: string;
  type?: string;
  defaultValue?: string | boolean;
  choices?: string[];
};

export type UtilityActions = typeof UTILITY_ACTIONS[number] | undefined;
export type UtilityActionsCheck = (
  options: Partial<OptionKeysWithValues>
) => UtilityActions;

export type UtilityFunctionsArgs = {
  transformPath?: string;
  dryRun?: boolean;
};

export type CreateBatchRenameList = (
  renameList: LegacyRenameList,
  filesToRevert?: string[]
) => Promise<void>[];

export type RestoreBaseReturn = {
  rollbackData: LegacyRenameList;
  existingFiles: string[];
  missingFiles: string[];
  filesToRestore: string[];
};
export type RestoreBaseFunction = (
  transformPath?: string
) => Promise<RestoreBaseReturn>;
export type RestoreOriginalFileNames = (
  args: UtilityFunctionsArgs
) => Promise<void>;
export type CleanUpRollbackFile = (args: UtilityFunctionsArgs) => Promise<void>;
export type ListFiles = (
  transformPath?: string,
  excludeFilter?: string,
  targetType?: ValidTypes
) => Promise<Dirent[]>;
export type AreNewNamesDistinct = (renameList: LegacyRenameList) => boolean;
export type NumberOfDuplicatedNamesArgs = {
  renameList: LegacyRenameList;
  checkType: "results" | "transforms";
};
export type NumberOfDuplicatedNames = (
  args: NumberOfDuplicatedNamesArgs
) => number;
export type CheckPath = (
  path: string,
  targetType?: ValidTypes
) => Promise<string>;
export type DetermineDir = (transformPath: string | undefined) => string;
export type ComposeRenameStringArgs = {
  baseName: string;
  newName: string;
  ext?: string;
  preserveOriginal?: boolean;
  addText?: string;
  textPosition?: "prepend" | "append";
  separator?: string;
  truncate?: string;
  format?: ValidTextFormats;
  noExtensionPreserve?: boolean;
};
export type ComposeRenameString = (args: ComposeRenameStringArgs) => string;

export type FormatTextTransform = (args: GenerateRenameListArgs) => LegacyRenameList;

export type KeepTransformArgs = Pick<
  GenerateRenameListArgs,
  | "keep"
  | "addText"
  | "separator"
  | "textPosition"
  | "splitFileList"
  | "noExtensionPreserve"
  | "format"
>;

export type KeepTransform = (args: KeepTransformArgs) => LegacyRenameList;

// Temporary types which will become the new RenameList type
export type RenameItem = Omit<LegacyRenameItem, "sourcePath"> & {
  referenceId: string;
};
export type RenameItemsArray = RenameItem[];
export interface RenameList {
  sourcePath: string;
  transforms: RenameItemsArray[];
}
export interface RestoreList {
  sourcePath: string;
  transforms: RenameItemsArray;
}
export interface BaseFileMapperArgs {
  rollbackFile: RenameList;
  rollbackLevel?: number;
}

export type RestoreFileMapper = ({
  rollbackFile,
  rollbackLevel,
}: BaseFileMapperArgs) => RestoreList;

export type DetermineRollbackLevel = ({
  rollbackList,
  rollbackLevel,
}: {
  rollbackList: RenameItemsArray[];
  rollbackLevel: number;
}) => number;

export type BuildRestoreFile = ({restoreList,
  targetLevel,
  sourcePath,
}: {
  restoreList: Record<string, string[]>;
  targetLevel: number;
  sourcePath: string;
}) => RestoreList;

export interface FilesWithMissingRestores {
  file: string;
  found: number;
  requested: number;
}
