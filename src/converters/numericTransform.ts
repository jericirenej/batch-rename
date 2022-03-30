import type { NumericTransform } from "../types";
import { VALID_NUMERIC_TRANSFORM_TYPES } from "../constants.js";
import { composeRenameString } from "./utils.js";

/**Return a list of odd|even names, along with original file names */
export const numericTransform: NumericTransform = (args) => {
  const { splitFileList, customText, textPosition, preserveOriginal, numericTransform, separator } =
    args;

  const listLength = splitFileList.length.toString().length;

  return splitFileList.map((splitFile, index) => {
    const { ext, baseName, sourcePath } = splitFile;
    let sequenceNumber = generateSequenceNumber(numericTransform!, index);

    const stringifiedNum = generatePaddedNumber(sequenceNumber, listLength);
    const rename = composeRenameString({baseName, ext, newName:stringifiedNum, preserveOriginal, customText, textPosition, separator});
    return { rename, original: baseName + ext, sourcePath };
  });
};

export const generateSequenceNumber = (
  transformType: typeof VALID_NUMERIC_TRANSFORM_TYPES[number],
  index: number
): number => {
  if (transformType === "odd") return 2 * index + 1;
  if (transformType === "even") return 2 * (index + 1);
  return index + 1;
};

export const generatePaddedNumber = (
  sequenceNumber: number,
  listLength: number
): string => {
  const sequenceNumLength = sequenceNumber.toString().length;
  const diff = listLength - sequenceNumLength + 1;
  return [...new Array(diff).fill(0), sequenceNumber].join("");
};
