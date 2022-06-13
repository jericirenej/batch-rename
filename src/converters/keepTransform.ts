import type { KeepTransform } from "../types";
import { composeRenameString } from "./utils.js";

export const keepTransform: KeepTransform = ({
  keep,
  addText,
  textPosition,
  separator,
  format,
  splitFileList,
}) => {
  const regexBase = `^.*(?=${keep})|(?<=${keep})`;
  const matcher = new RegExp(regexBase, "gu");
  return splitFileList.map((fileInfo) => {
    const { baseName, ext, sourcePath } = fileInfo;

    const newName = composeRenameString({
      baseName: baseName,
      newName: baseName.replaceAll(matcher, ""),
      separator,
      textPosition,
      addText,
      format,
    });
    return {
      rename: `${newName}${ext}`,
      original: `${baseName}${ext}`,
      sourcePath,
    };
  });
};
