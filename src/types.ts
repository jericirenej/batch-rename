import { Stats } from "fs";
import {
  UTILITY_ACTIONS,
  VALID_DATE_TRANSFORM_TYPES,
  VALID_NUMERIC_TRANSFORM_TYPES,
  VALID_TRANSFORM_TYPES,
} from "./constants";

export type TransformTypes = typeof VALID_TRANSFORM_TYPES[number];
export type ExtractBaseAndExtTemplate = {
  baseName: string;
  ext: string;
  sourcePath: string;
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
  fileList: string[],
  sourcePath: string
) => ExtractBaseAndExtReturn;
export type RenameList = {
  rename: string;
  original: string;
  sourcePath: string;
}[];
export type RenameListArgs = {
  transformPattern: TransformTypes;
  customText?: string;
  textPosition?: "append" | "prepend";
  preserveOriginal?: boolean;
  dateRename?: DateTransformOptions;
  detailedDate?: boolean;
  dryRun?: boolean;
  searchAndReplace?: string[];
  transformPath?: string;
  numericTransform?: typeof VALID_NUMERIC_TRANSFORM_TYPES[number];
  separator?: string;
};
export type GenerateRenameListArgs = RenameListArgs & {
  splitFileList: ExtractBaseAndExtReturn | FileListWithStatsArray;
};
export type GenerateRenameList = (args: GenerateRenameListArgs) => RenameList;

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

export type SearchAndReplace = (args: GenerateRenameListArgs) => RenameList;

export type OptionKeys =
  | "preserveOriginal"
  | "restore"
  | "dryRun"
  | "cleanRollback"
  | "customText"
  | "dateRename"
  | "textPosition"
  | "searchAndReplace"
  | "detailedDate"
  | "folderPath"
  | "numericTransform"
  | "separator";

export type ProgramOptions = {
  short: string;
  long: OptionKeys;
  description: string;
  type?: string;
  defaultValue?: string | boolean;
  choices?: string[];
};

export type OptionKeysWithValues = Record<
  OptionKeys,
  boolean | string | string[]
>;

export type UtilityActions = typeof UTILITY_ACTIONS[number];
export type UtilityActionsCheck = (
  options: Partial<OptionKeysWithValues>
) => UtilityActions;

export type UtilityFunctionsArgs = {
  transformPath?: string;
  dryRun?: boolean;
};

export type RestoreBaseReturn = {
  rollbackData: RenameList;
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
export type ListFiles = (transformPath?: string) => Promise<string[]>;
export type AreNewNamesDistinct = (renameLIst: RenameList) => boolean;
export type CheckPath = (path: string) => Promise<string>;
export type DetermineDir = (transformPath: string | undefined) => string;
export type ComposeRenameStringArgs = {
  baseName: string;
  ext: string;
  newName: string;
  preserveOriginal?: boolean;
  customText?: string;
  textPosition?: "prepend" | "append";
  separator?: string;
};
export type ComposeRenameString = (args: ComposeRenameStringArgs) => string;
