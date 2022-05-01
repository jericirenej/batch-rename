import type { ExtensionModifyTransform } from "../types.js";

export const extensionModifyTransform: ExtensionModifyTransform = ({
  splitFileList,
  extensionModify,
}) => {
  let newExtension = extensionModify;
  if (newExtension && newExtension[0] !== ".") {
    newExtension = `.${newExtension}`;
  }
  return splitFileList.map((fileInfo) => {
    const { baseName, ext, sourcePath } = fileInfo;
    return {
      original: `${baseName}${ext}`,
      rename: `${baseName}${newExtension}`,
      sourcePath,
    };
  });
};
