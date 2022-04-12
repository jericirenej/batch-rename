import type {
  GenerateSearchAndReplaceArgs,
  SearchAndReplace,
} from "../types.js";
import { extractBaseAndExt, truncateFile } from "./utils.js";

export const searchAndReplace: SearchAndReplace = ({
  searchAndReplace,
  splitFileList,
  truncate,
}) => {
  const generatedArgs = generateArguments(searchAndReplace!);
  const targetList = splitFileList.map((fileInfo) => {
    const { filter, replace } = generatedArgs;
    let { baseName, sourcePath, ext } = fileInfo;
    const original = `${baseName}${ext}`;
    let rename = original;
    if (filter && filter.test(original)) {
      rename = original.replaceAll(filter, replace);
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

const generateArguments: GenerateSearchAndReplaceArgs = (args) => {
  if (args.length === 1) return { filter: null, replace: args[0] };
  return { filter: new RegExp(args[0], "g"), replace: args[1] };
};

const optionalTruncate = (
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
