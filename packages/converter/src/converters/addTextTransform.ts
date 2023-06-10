import type { AddTextTransform, BaseRenameItem } from "batch-rename-lib";
import { composeRenameString, truncateFile } from "../utils/utils.js";

export const addTextTransform: AddTextTransform = ({
  splitFileList,
  textPosition,
  separator,
  truncate,
  addText,
  format,
  noExtensionPreserve,
}) =>
  splitFileList.map((fileInfo) => {
    const { baseName, ext } = fileInfo;
    let newName = baseName;
    if (truncate) {
      newName = truncateFile({ baseName, preserveOriginal: true, truncate });
    }
    const rename = composeRenameString({
      baseName,
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
    const renameItem: BaseRenameItem = { original, rename };
    return renameItem;
  });
