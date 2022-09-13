import { Dirent } from "fs";
import type {
  GenerateSearchAndReplaceArgs,
  SearchAndReplace,
} from "../types.js";
import { formatFile } from "./formatTextTransform.js";
import { extractBaseAndExt, truncateFile } from "./utils.js";

export const searchAndReplace: SearchAndReplace = ({
  searchAndReplace,
  noExtensionPreserve,
  splitFileList,
  truncate,
  format,
}) => {
  const generatedArgs = generateSearchAndReplaceArgs(searchAndReplace!);
  const targetList = splitFileList.map((fileInfo) => {
    const { filter, replace } = generatedArgs;
    let { baseName, sourcePath, ext, type } = fileInfo;
    const original = `${baseName}${ext}`;
    let rename = noExtensionPreserve ? original : baseName;
    if (filter && filter.test(original)) {
      rename = rename.replaceAll(filter, replace);
    }
    // Perform text formatting, if needed.
    if (format) {
      rename = formatFile(rename, format);
    }
    // Re-add extension, if noExtensionPreserve is not specified.
    if (!noExtensionPreserve) {
      rename += ext;
    }
    if (truncate && !isNaN(Number(truncate))) {
      if (rename !== original) {
        rename = optionalTruncate(truncate, rename, sourcePath, type);
      }
    }
    return { original, rename, sourcePath };
  });
  return targetList;
};

export const generateSearchAndReplaceArgs: GenerateSearchAndReplaceArgs = (
  args
) => {
  if (args.length === 1) return { filter: null, replace: args[0] };
  return { filter: new RegExp(args[0], "gu"), replace: args[1] };
};

/** Will try and separate baseName and ext, before calling truncateFile */
export const optionalTruncate = (
  truncate: string,
  modifiedName: string,
  sourcePath: string,
  type: "directory" | "file"
): string => {
  // Provide file type data for extractBaseAndExt.
  const nameWithFileType = [
    {
      name: modifiedName,
      isDirectory() {
        return type === "directory";
      },
    },
  ] as Dirent[];
  const renameBaseAndExt = extractBaseAndExt(nameWithFileType, sourcePath);
  const { baseName: newBase, ext: newExt } = renameBaseAndExt[0];
  return `${truncateFile({
    baseName: newBase,
    preserveOriginal: true,
    truncate,
  })}${newExt}`;
};
