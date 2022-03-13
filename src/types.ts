export type TransformTypes = "even" | "odd";
export type ExtractBaseAndExtReturn = { baseName: string; ext: string }[];
export type ExtractBaseAndExt = (fileList: string[]) => ExtractBaseAndExtReturn;
