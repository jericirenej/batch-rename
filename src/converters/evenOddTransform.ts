import type { EvenOddTransform } from "../types";
import { MIN_NUMBER_LENGTH } from "../constants.js";

/**Return a list of odd|even names, along with original file names */
export const evenOddTransform: EvenOddTransform = (args) => {
  const { splitFileList, transformPattern, appendName, preserveOriginal } =
    args;
  return splitFileList.map((splitFile, index) => {
    const { ext, baseName, sourcePath } = splitFile;
    let sequenceNumber = index * 2;
    if (transformPattern === "odd") sequenceNumber += 1;
    if (transformPattern === "even") sequenceNumber += 2;

    let stringifiedNum = sequenceNumber.toString();
    const diffToMinLength = MIN_NUMBER_LENGTH - stringifiedNum.length;
    if (diffToMinLength > 0) {
      const prePend = new Array(diffToMinLength).fill("0").join("");
      stringifiedNum = prePend + stringifiedNum;
    }
    let finalRename = `${stringifiedNum}${ext}`;
    const append = preserveOriginal ? baseName : appendName ? appendName : "";
    finalRename = append
      ? `${stringifiedNum}-${append}${ext}`
      : `${stringifiedNum}${ext}`;
    return { rename: finalRename, original: baseName + ext, sourcePath };
  });
};
