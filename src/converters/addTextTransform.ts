import type { AddTextTransform, BaseRenameItem } from "../types.js";
import { composeRenameString, truncateFile } from "../utils/utils.js";

export const addTextTransform: AddTextTransform = ({
  splitFileList,
  textPosition,
  separator,
  truncate,
  addText,
  format,
  noExtensionPreserve,
}) => {
  return splitFileList.map((fileInfo) => {
    const { baseName, ext, sourcePath } = fileInfo;
    let newName = baseName;
    if(truncate) {
      newName = truncateFile({baseName, preserveOriginal:true, truncate});
    }
    const rename = composeRenameString({
      baseName: baseName,
      newName,
      addText: addText!,
      ext,
      separator,
      textPosition,
      preserveOriginal: true,
      format,
      noExtensionPreserve,
    });
    const original = `${baseName}${ext}`;
    const renameItem:BaseRenameItem = {original, rename};
    return renameItem;
  });
};
