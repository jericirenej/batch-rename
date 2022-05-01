import { FormatTextTransform, ValidTextFormats } from "../types.js";
import { composeRenameString } from "./utils.js";

export const formatTextTransform: FormatTextTransform = ({
  splitFileList,
  format,
  noExtensionPreserve,
  truncate,
}) => {
  return splitFileList.map((fileInfo) => {
    const { baseName, ext, sourcePath } = fileInfo;
    const rename = composeRenameString({
      baseName,
      newName: baseName,
      ext,
      format,
      truncate,
      noExtensionPreserve,
      preserveOriginal: false,
    });
    return { original: `${baseName}${ext}`, rename, sourcePath };
  });
};

const capitalizeString = (str: string): string => {
  return str
    .split(" ")
    .map(
      (word) =>
        `${word[0].toLocaleUpperCase()}${word.slice(1).toLocaleLowerCase()}`
    )
    .join(" ");
};
export const formatFile = (file: string, format: ValidTextFormats): string => {
  let rename = file;
  if (format === "uppercase") {
    rename = rename.toLocaleUpperCase();
  }
  if (format === "lowercase") {
    rename = rename.toLocaleLowerCase();
  }
  if (format === "capitalize") {
    rename = capitalizeString(rename);
  }
  return rename;
};
