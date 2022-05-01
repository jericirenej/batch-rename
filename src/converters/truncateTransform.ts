import { ERRORS } from "../messages/errMessages.js";
import type { TruncateTransform } from "../types.js";
import { composeRenameString } from "./utils.js";
const {truncateNoPreserveOriginal, truncateInvalidArgument } = ERRORS.transforms;

export const truncateTransform: TruncateTransform = ({
  splitFileList,
  addText,
  preserveOriginal,
  separator,
  textPosition,
  truncate,
  format,
  noExtensionPreserve,
}) => {
  if (!preserveOriginal) throw new Error(truncateNoPreserveOriginal);

  const limit = Number(truncate);

  if (isNaN(limit)) throw new Error(truncateInvalidArgument);

  return splitFileList.map((fileInfo) => {
    const { baseName, ext, sourcePath } = fileInfo;
    const newName = limit !== 0 ? baseName.slice(0, limit) : baseName;
    const rename = composeRenameString({
      baseName,
      ext,
      addText,
      textPosition,
      separator,
      // Must set preserveOriginal to false, since we are already including it in newName
      preserveOriginal: false,
      newName,
      format,
      noExtensionPreserve,
    });
    return {
      rename,
      original: `${baseName}${ext}`,
      sourcePath,
    };
  });
};
