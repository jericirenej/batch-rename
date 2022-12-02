import { Dirent, Stats } from "fs";
import {
  UTILITY_ACTIONS,
  VALID_DATE_TRANSFORM_TYPES,
  VALID_NUMERIC_TRANSFORM_TYPES,
  VALID_TRANSFORM_TYPES
} from "./constants";

// PROGRAM PARSE AND CONFIG TYPES
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

export type OptionKeysWithValues = Record<OptionKeys, unknown>;

export type ProgramCLIOptions = {
  short: string;
  long: OptionKeys;
  description: string;
  type?: string;
  defaultValue?: string | boolean;
  choices?: string[];
};

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
export type GenerateRenameList = (
  args: GenerateRenameListArgs
) => BaseRenameList;

export type DryRunTransformArgs = {
  transformedNames: BaseRenameList;
  transformPattern: TransformTypes[];
  transformPath: string;
};
export type DryRunTransform = (args: DryRunTransformArgs) => Promise<boolean>;

export type DryRunRestore = (args: RestoreBaseReturn) => Promise<boolean>;

// TRANSFORM TYPES
interface GeneralTransformOperation {
  (args: GenerateRenameListArgs): BaseRenameList;
}
export type NumericTransform = GeneralTransformOperation;
export type DateTransform = GeneralTransformOperation;
export type SearchAndReplace = GeneralTransformOperation;
export type TruncateTransform = GeneralTransformOperation;
export type AddTextTransform = GeneralTransformOperation;
export type ExtensionModifyTransform = GeneralTransformOperation;
export type FormatTextTransform = GeneralTransformOperation;

export type KeepTransform = (args: KeepTransformArgs) => BaseRenameList;

// TRANSFORM RELATED TYPES AND UTILS
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

export type TruncateFileNameArgs = {
  preserveOriginal: boolean;
  baseName: string;
  truncate: string;
  format?: string;
};
export type TruncateFileName = (args: TruncateFileNameArgs) => string;

export type UtilityActions = typeof UTILITY_ACTIONS[number] | undefined;
export type UtilityActionsCheck = (
  options: Partial<OptionKeysWithValues>
) => UtilityActions;

export type UtilityFunctionsArgs = {
  transformPath?: string;
  dryRun?: boolean;
  rollbackLevel?: number;
};

export type CreateBatchRenameList = ({
  transforms,
  filesToRestore,
  sourcePath,
}: {
  transforms: BaseRenameList;
  sourcePath: string;
  filesToRestore?: string[];
}) => Promise<void>[];

export type RestoreBaseReturn = {
  rollbackData: RollbackFile;
  restoreList: ConversionList;
  existingFiles: string[];
  missingFiles: string[];
  filesToRestore: string[];
};
export type RestoreBaseFunction = (
  transformPath?: string,
  rollbackLevel?: number
) => Promise<RestoreBaseReturn>;
export type RestoreOriginalFileNames = (
  args: UtilityFunctionsArgs
) => Promise<void>;

export type TrimRollbackFile = (
  args: Omit<ConversionList, "transforms">
) => Promise<void>;

export type ListFiles = (
  transformPath?: string,
  excludeFilter?: string,
  targetType?: ValidTypes
) => Promise<Dirent[]>;

export type AreNewNamesDistinct = (renameList: BaseRenameList) => boolean;
export type AreTransformsDistinct = AreNewNamesDistinct;

export type NumberOfDuplicatedNamesArgs = {
  renameList: BaseRenameList;
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

// RENAME ITEMS AND ROLLBACKS
export interface BaseRenameItem {
  rename: string;
  original: string;
}

export type BaseRenameList = BaseRenameItem[];
export interface RenameItem extends BaseRenameItem {
  referenceId: string;
}

export type RenameItemsArray = RenameItem[];

/** Rollback file whose transform property that includes a history of transform operations
 * (i.e. an array of arrays).*/
export interface RollbackFile {
  sourcePath: string;
  transforms: RenameItemsArray[];
}

/** Conversion list represent an array of file transforms which includes
 * the number of rollbacks performed for each file and current and target file name */
export interface ConversionList {
  sourcePath: string;
  transforms: RenameItem[];
  targetLevel: number;
}

export interface BaseFileMapperArgs {
  rollbackFile: RollbackFile;
  rollbackLevel?: number;
}

export type RestoreByLevels = (args: BaseFileMapperArgs) => ConversionList;

export type DetermineRollbackLevel = ({
  transformList,
  rollbackLevel,
}: {
  transformList: RenameItemsArray[];
  rollbackLevel?: number;
}) => number;

export interface FilesWithMissingRestores {
  file: string;
  found: number;
  requested: number;
}

export interface CheckExistingFiles {
  ({
    existingFiles,
    transforms,
    rollbackLevel,
  }: {
    existingFiles: string[];
    transforms: RenameItemsArray[];
    rollbackLevel: number;
  }): { filesToRestore: string[]; missingFiles: string[] };
}

export interface CreateRollbackFile {
  ({
    transforms,
    sourcePath,
  }: {
    transforms: BaseRenameList;
    sourcePath: string;
  }): Promise<RollbackFile>;
}

export interface PromiseRejectedWriteResult extends PromiseRejectedResult {
  reason: {
    errno: number;
    code: string;
    syscall: string;
    path: string;
    dest: string;
  };
}
