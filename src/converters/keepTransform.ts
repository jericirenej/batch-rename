import type { KeepTransform } from "../types";
import { composeRenameString } from "./utils.js";

export const keepTransform: KeepTransform = ({
  keep,
  addText,
  textPosition,
  separator,
  format,
  splitFileList,
  noExtensionPreserve,
}) => {
  const regexBase = `^.*(?=${keep})|(?<=${keep}).*$`;
  const matcher = new RegExp(regexBase, "gu");
  return splitFileList.map((fileInfo) => {
    const { baseName: _baseName, ext, sourcePath } = fileInfo;
    const baseName = noExtensionPreserve ? `${_baseName}${ext}` : _baseName;
    const original = `${_baseName}${ext}`;
    const newName = composeRenameString({
      baseName: _baseName,
      newName: baseName.replaceAll(matcher, ""),
      ext: noExtensionPreserve ? "" : ext,
      separator,
      textPosition,
      addText,
      format,
    });
    return {
      rename: `${newName}`,
      original,
      sourcePath,
    };
  });
};
