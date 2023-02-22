import type {
  BaseRenameItem,
  BaseRenameList,
  KeepAndOmitBase,
  KeepTransform,
  OmitTransform
} from "../types";
import { composeRenameString } from "../utils/utils.js";

const baseReplacer = ({
  matcher,
  addText,
  textPosition,
  separator,
  /**Current limitation: format option will never format the extension, as
   * the extension will be removed if noExtensionPreserve is true.
   */
  format,
  splitFileList,
  noExtensionPreserve,
}: KeepAndOmitBase & { matcher: RegExp }): BaseRenameList => {
  const renameList: BaseRenameList = [];
  splitFileList.forEach((fileInfo) => {
    const { baseName: _baseName, ext } = fileInfo;
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
    const rename = `${newName}`;
    if (rename !== original) {
      const renameItem: BaseRenameItem = { rename: `${newName}`, original };
      renameList.push(renameItem);
    }
  });
  return renameList;
};

export const keepTransform: KeepTransform = ({ keep, ...args }) => {
  if(!keep) return [];
  const regexBase = `^.*(?=${keep})|(?<=${keep}).*$`;
  const matcher = new RegExp(regexBase, "gu");
  return baseReplacer({ matcher, ...args });
  /*  const renameList:BaseRenameList = [];
  splitFileList.forEach((fileInfo) => {
    const { baseName: _baseName, ext } = fileInfo;
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
    const rename = `${newName}`;
    if(rename !== original) {
      const renameItem: BaseRenameItem = { rename: `${newName}`, original };
      renameList.push(renameItem);
    }
  });
  return renameList; */
};

export const omitTransform: OmitTransform = ({ omit, ...args }) => {
  if(!omit) return [];
  return baseReplacer({ matcher: new RegExp(omit, "gu"), ...args });
};
