import type { AddTextTransform } from "../types.js";
import { composeRenameString, truncateFile } from "./utils.js";

export const addTextTransform: AddTextTransform = ({
  splitFileList,
  textPosition,
  separator,
  truncate,
  addText,
}) => {
  return splitFileList.map((fileInfo) => {
    const { baseName:_baseName, ext, sourcePath } = fileInfo;
    const baseName = truncate
      ? truncateFile({
          preserveOriginal: true,
          baseName: _baseName,
          truncate,
        })
      : _baseName;
    const rename = composeRenameString({
      baseName,
      ext,
      separator,
      textPosition,
      newName: baseName,
      addText,
    });
    const original = `${baseName}${ext}`;
    return { original, rename, sourcePath };
  });
};
