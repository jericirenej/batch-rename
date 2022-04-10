import type { TruncateFileName, TruncateTransform } from "../types.js";
import { ERRORS } from "../messages/errMessages.js";
import { composeRenameString } from "./utils.js";
const { TRUNCATE_NO_PRESERVE_ORIGINAL, TRUNCATE_INVALID_ARGUMENT } = ERRORS;

export const truncateTransform: TruncateTransform = ({
  splitFileList,
  customText,
  preserveOriginal,
  separator,
  textPosition,
  truncate,
}) => {
  if (!preserveOriginal) throw new Error(TRUNCATE_NO_PRESERVE_ORIGINAL);

  const limit = Number(truncate);

  if (isNaN(limit)) throw new Error(TRUNCATE_INVALID_ARGUMENT);

  return splitFileList.map((fileInfo) => {
    const { baseName, ext, sourcePath } = fileInfo;
    const newName = baseName.slice(0, limit + 1);
    const rename = composeRenameString({
      baseName,
      ext,
      customText,
      textPosition,
      separator,
      // Must set preserveOriginal to false, since we are already including it in newName
      preserveOriginal: false,
      newName,
    });
    return {
      rename,
      original: `${baseName}${ext}`,
      sourcePath,
    };
  });
};

export const truncateFile: TruncateFileName = ({
  preserveOriginal,
  baseName,
  truncate,
}) => {
  if (!preserveOriginal) {
    return baseName;
  }
  const limit = Number(truncate);
  if (isNaN(limit)) throw new Error(TRUNCATE_INVALID_ARGUMENT);

  return baseName.slice(0, limit + 1);
};
