import type {
    BaseRenameItem,
    GenerateSearchAndReplaceArgs,
    KeepTransform,
    OmitTransform,
    SearchAndReplace
} from "@batch-rename/lib";
import { composeRenameString } from "../utils/utils.js";

export const generateSearchAndReplaceArgs: GenerateSearchAndReplaceArgs = (
  args
) => {
  if (args.length === 1) return { filter: null, replace: args[0] };
  return { filter: new RegExp(args[0], "gu"), replace: args[1] };
};

export const searchAndReplace: SearchAndReplace = ({
  searchAndReplace,
  addText,
  format,
  noExtensionPreserve,
  separator,
  splitFileList,
  textPosition,
  truncate,
}) => {
  const generatedArgs = generateSearchAndReplaceArgs(searchAndReplace!);
  const renameList: BaseRenameItem[] = [];
  const { filter, replace } = generatedArgs;
  // Early return, if filter is invalid.
  if (!filter) return renameList;
  splitFileList.forEach((fileInfo) => {
    const { baseName: originalBase, ext } = fileInfo;
    // Note that that lookaheads or references to the extension delimiter ('.') will not
    // work as expected, if noExtensionPreserve is false or undefined, since the extension will
    // be cut off from the baseName in order to be protected from transformation.
    const baseName = noExtensionPreserve ? `${originalBase}${ext}` : originalBase;
    const original = `${originalBase}${ext}`;
    const newName = composeRenameString({
      baseName: originalBase,
      newName: baseName.replaceAll(filter, replace),
      ext: noExtensionPreserve ? "" : ext,
      separator,
      textPosition,
      addText,
      format,
      truncate,
    });
    const rename = `${newName}`;
    // Do not push identical transforms
    if (rename !== original) {
      const renameItem: BaseRenameItem = { rename: `${newName}`, original };
      renameList.push(renameItem);
    }
  });
  return renameList;
};


export const keepTransform: KeepTransform = ({ keep, ...args }) => {
  if (!keep) return [];
  const regexBase = `^.*(?=${keep})|(?<=${keep}).*$`;
  /* Current limitation: format option will never format the extension, as
   * the extension will usually be removed by the keep operation, if noExtensionPreserve is true. */
  return searchAndReplace({ searchAndReplace: [regexBase, ""], ...args });
};

export const omitTransform: OmitTransform = ({ omit, ...args }) => {
  if (!omit) return [];
  return searchAndReplace({ searchAndReplace: [omit, ""], ...args });
};
