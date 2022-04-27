import type { AddTextTransform } from "../types.js";
import { composeRenameString } from "./utils.js";

export const addTextTransform: AddTextTransform = ({
  splitFileList,
  textPosition,
  separator,
  truncate,
  addText
}) => {
  return splitFileList.map((fileInfo) => {
    const { baseName, ext, sourcePath } = fileInfo;
    const rename = composeRenameString({
      baseName: baseName,
      newName: addText!,
      ext,
      separator,
      textPosition,
      truncate,
      preserveOriginal: true,
    });
    const original = `${baseName}${ext}`;
    return { original, rename, sourcePath };
  });
};
