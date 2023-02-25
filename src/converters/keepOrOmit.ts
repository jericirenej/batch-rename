import type {
  BaseRenameItem,
  BaseRenameList, KeepTransform,
  OmitTransform, RegexBaseArgs
} from "../types";
import { composeRenameString } from "../utils/utils.js";

/** Remove text that falls under the matcher and run composeRenameString 
 * with other arguments. */
export const baseReplacer = ({
  matcher,
  noExtensionPreserve,
  splitFileList,
  addText,
  textPosition,
  separator,
  format,
  truncate

}: RegexBaseArgs & { matcher: RegExp|string }): BaseRenameList => {
  const matchArg = matcher instanceof RegExp ? matcher : new RegExp(matcher, "gu");
  const renameList: BaseRenameList = [];
  splitFileList.forEach((fileInfo) => {
    const { baseName: _baseName, ext } = fileInfo;
    const baseName = noExtensionPreserve ? `${_baseName}${ext}` : _baseName;
    const original = `${_baseName}${ext}`;
    const newName = composeRenameString({
      baseName: _baseName,
      newName: baseName.replaceAll(matchArg, ""),
      ext: noExtensionPreserve ? "" : ext,
      separator,
      textPosition,
      addText,
      format,
      truncate
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
  /*Current limitation: format option will never format the extension, as
   * the extension will usually be removed by the keep operation, if noExtensionPreserve is true. */
  const matcher = new RegExp(regexBase, "gu");
  return baseReplacer({ matcher, ...args });
};

export const omitTransform: OmitTransform = ({ omit, ...args }) => {
  if(!omit) return [];
  return baseReplacer({ matcher: new RegExp(omit, "gu"), ...args });
};
