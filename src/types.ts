import { Stats } from "fs";
import { VALID_TRANSFORM_TYPES } from "./converter/constants";

export type TransformTypes = typeof VALID_TRANSFORM_TYPES[number];
type ExtractBaseAndExtTemplate = { baseName: string; ext: string };
export type ExtractBaseAndExtReturn = ExtractBaseAndExtTemplate[];
export type FileListWithStats = (ExtractBaseAndExtTemplate & {stats: Stats})[];
export type ExtractBaseAndExt = (fileList: string[]) => ExtractBaseAndExtReturn;
export type RenameList = { rename: string; original: string }[];
export type RenameListArgs = {
  transformPattern: TransformTypes;
  appendName?: string;
  preserveOriginal?: boolean;
};
export type GenerateRenameListArgs = RenameListArgs & {
  splitFileList: ExtractBaseAndExtReturn;
};
export type GenerateRenameList = (args: GenerateRenameListArgs) => RenameList;

export type GeneralTransformReturn = {
  rename: string;
  original: string;
}[];

export type EvenOddTransform = (
  args: GenerateRenameListArgs
) => GeneralTransformReturn;

export type DateTransformOptions =
  | "creationDate"
  | "lastAccessed"
  | "lastModified";
export type DateTransformTypes = {
  type: DateTransformOptions;
  splitFileList: ExtractBaseAndExtReturn;
};

export type ProvideFileStats = (splitFileList: ExtractBaseAndExtReturn)=> Promise<FileListWithStats>;

export type DateTransform = (
  args: DateTransformTypes
) => Promise<GeneralTransformReturn>;
