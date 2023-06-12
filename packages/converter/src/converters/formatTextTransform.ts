import { BaseRenameItem, FormatTextTransform, ValidTextFormats } from "@batch-rename/lib";
import { composeRenameString } from "../utils/utils.js";

export const formatTextTransform: FormatTextTransform = ({
  splitFileList,
  format,
  noExtensionPreserve,
  truncate,
}) =>
  splitFileList.map((fileInfo) => {
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
    const renameItem: BaseRenameItem = { original: `${baseName}${ext}`, rename };
    return renameItem;
  });

const capitalizeString = (str: string): string =>
  str
    .split(" ")
    .map((word) => `${word[0].toLocaleUpperCase()}${word.slice(1).toLocaleLowerCase()}`)
    .join(" ");

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
