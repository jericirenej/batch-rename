import { Stats } from "fs";
import { VALID_DATE_TRANSFORM_TYPES, VALID_TRANSFORM_TYPES } from "./constants";

export type TransformTypes = typeof VALID_TRANSFORM_TYPES[number];
type ExtractBaseAndExtTemplate = { baseName: string; ext: string };
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
export type ExtractBaseAndExt = (fileList: string[]) => ExtractBaseAndExtReturn;
export type RenameList = { rename: string; original: string }[];
export type RenameListArgs = {
  transformPattern: TransformTypes;
  appendName?: string;
  preserveOriginal?: boolean;
  dateRename?: DateTransformOptions;
  detailedDate?: boolean;
};
export type GenerateRenameListArgs = RenameListArgs & {
  splitFileList: ExtractBaseAndExtReturn | FileListWithStatsArray;
};
export type GenerateRenameList = (args: GenerateRenameListArgs) => RenameList;

export type GeneralTransformReturn = {
  rename: string;
  original: string;
}[];

export type EvenOddTransform = (
  args: GenerateRenameListArgs
) => GeneralTransformReturn;

export type DateTransformOptions = typeof VALID_DATE_TRANSFORM_TYPES[number];
export type DateTransformTypes = {
  type: DateTransformOptions;
  fileList: FileListWithStats;
};

export type ProvideFileStats = (
  splitFileList: ExtractBaseAndExtReturn
) => Promise<FileListWithStatsArray>;

export type DateTransform = (
  args: GenerateRenameListArgs
) => GeneralTransformReturn;

export type OptionKeys =
  | "odd"
  | "even"
  | "preserveOriginal"
  | "restore"
  | "dryRun"
  | "cleanRollback"
  | "appendName"
  | "dateRename"
  | "searchAndReplace"
  | "detailedDate";

export type ProgramOptions = {
  short: string;
  long: OptionKeys;
  description: string;
  type?: string;
  defaultValue?: string|boolean;
  choices?: string[];
};

export type OptionKeysWithValues = Record<
  OptionKeys,
  boolean | string | string[]
>;
