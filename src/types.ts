export const validTransformTypes = ["even", "odd", "sortByDate"] as const;
export type TransformTypes = typeof validTransformTypes[number];
export type ExtractBaseAndExtReturn = { baseName: string; ext: string }[];
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

export type EvenOddTransformReturn = {
  rename: string;
  original: string;
}[];

export type EvenOddTransform = (
  args: GenerateRenameListArgs
) => EvenOddTransformReturn;
