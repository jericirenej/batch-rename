export type TransformTypes = "even" | "odd";
export type ExtractBaseAndExtReturn = { baseName: string; ext: string }[];
export type ExtractBaseAndExt = (fileList: string[]) => ExtractBaseAndExtReturn;
export type RenameList = {rename:string, original: string}[];
export type GenerateRenameList = (splitFileList: ExtractBaseAndExtReturn, transformPattern: TransformTypes, initialName?:string) => RenameList;

export type ProgramOptions = {
  short: string;
  long: string;
  type: string;
  description: string;
  defaultValue: string;
}[]