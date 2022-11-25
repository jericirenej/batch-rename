import type { BaseRenameItem, ExtensionModifyTransform } from "../types.js";

export const extensionModifyTransform: ExtensionModifyTransform = ({
  splitFileList,
  extensionModify,
}) => {
  let newExtension = extensionModify;
  if (newExtension && newExtension[0] !== ".") {
    newExtension = `.${newExtension}`;
  }
  return splitFileList.map((fileInfo) => {
    const { baseName, ext } = fileInfo;
    const renameItem:BaseRenameItem = {
      original: `${baseName}${ext}`,
      rename: `${baseName}${newExtension}`,
    };
    return renameItem;
  });
};
