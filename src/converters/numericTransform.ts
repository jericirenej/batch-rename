import type { NumericTransform } from "../types";
import { VALID_NUMERIC_TRANSFORM_TYPES } from "../constants.js";

/**Return a list of odd|even names, along with original file names */
export const numericTransform: NumericTransform = (args) => {
  const { splitFileList, appendName, preserveOriginal, numericTransform } =
    args;

  const listLength = splitFileList.length.toString().length;

  return splitFileList.map((splitFile, index) => {
    const { ext, baseName, sourcePath } = splitFile;
    let sequenceNumber = generateSequenceNumber(numericTransform!, index);

    const stringifiedNum = generatePaddedNumber(sequenceNumber, listLength);

    let finalRename = `${stringifiedNum}${ext}`;
    const append = preserveOriginal ? baseName : appendName ? appendName : "";
    finalRename = append
      ? `${stringifiedNum}-${append}${ext}`
      : `${stringifiedNum}${ext}`;
    return { rename: finalRename, original: baseName + ext, sourcePath };
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
  console.log(listLength, sequenceNumber);
  const sequenceNumLength = sequenceNumber.toString().length;
  const diff = listLength - sequenceNumLength + 1;
  return [...new Array(diff).fill(0), sequenceNumber].join("");
};
