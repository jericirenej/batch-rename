import type {
  GenerateSearchAndReplaceArgs,
  SearchAndReplace,
} from "../types.js";

export const searchAndReplace: SearchAndReplace = (args) => {
  const { searchAndReplace, splitFileList } = args;
  const generatedArgs = generateArguments(searchAndReplace!);
  const targetList = splitFileList.map((fileInfo) => {
    const { filter, replace } = generatedArgs;
    let {baseName, sourcePath, ext} = fileInfo;
    const original = `${baseName}${ext}`;
    let rename = original;
    if (filter && filter.test(original)) {
      rename = original.replaceAll(filter, replace);
    }
    return { original, rename, sourcePath };
  });
  return targetList;
};

const generateArguments: GenerateSearchAndReplaceArgs = (args) => {
  if (args.length === 1) return { filter: null, replace: args[0] };
  return { filter: new RegExp(args[0], "g"), replace: args[1] };
};
