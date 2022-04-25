import type {
  GenerateSearchAndReplaceArgs,
  SearchAndReplace,
} from "../types.js";
import { extractBaseAndExt, truncateFile } from "./utils.js";

export const searchAndReplace: SearchAndReplace = ({
  searchAndReplace,
  noExtensionPreserve,
  splitFileList,
  truncate,
}) => {
  const generatedArgs = generateArguments(searchAndReplace!);
  const targetList = splitFileList.map((fileInfo) => {
    const { filter, replace } = generatedArgs;
    let { baseName, sourcePath, ext } = fileInfo;
    let original = noExtensionPreserve ? `${baseName}${ext}` : baseName;
    let rename = original;
    if (filter && filter.test(original)) {
      rename = original.replaceAll(filter, replace);
    }
    // Re-add extension, if noExtensionPreserve is not specified.
    if (!noExtensionPreserve) {
      rename += ext;
    }
    if (truncate && !isNaN(Number(truncate))) {
      if (rename !== original) {
        rename = optionalTruncate(truncate, rename, sourcePath);
      }
    }
    return { original, rename, sourcePath };
  });
  return targetList;
};

export const generateArguments: GenerateSearchAndReplaceArgs = (args) => {
  if (args.length === 1) return { filter: null, replace: args[0] };
  return { filter: new RegExp(args[0], "gu"), replace: args[1] };
};

/** Will try and separate baseName and ext, before calling truncateFile */
export const optionalTruncate = (
  truncate: string,
  modifiedName: string,
  sourcePath: string
): string => {
  const renameBaseAndExt = extractBaseAndExt([modifiedName], sourcePath);
  const { baseName: newBase, ext: newExt } = renameBaseAndExt[0];
  return `${truncateFile({
    baseName: newBase,
    preserveOriginal: true,
    truncate,
  })}${newExt}`;
};
