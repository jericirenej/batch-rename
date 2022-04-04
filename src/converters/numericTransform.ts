import type { NumericTransform } from "../types";
import { VALID_NUMERIC_TRANSFORM_TYPES } from "../constants.js";
import { composeRenameString } from "./utils.js";
import { isNumberObject } from "util/types";

/**Return a list of odd|even names, along with original file names */
export const numericTransform: NumericTransform = (args) => {
  const {
    splitFileList,
    customText,
    textPosition,
    preserveOriginal,
    numericTransform,
    separator,
    truncate,
    baseIndex: baseIndexArg,
  } = args;

  const listLength = splitFileList.length.toString().length;
  const baseIndex = checkBaseIndex(baseIndexArg);
  return splitFileList.map((splitFile, index) => {
    const indexWithBase = baseIndex ? baseIndex + index : index;
    const { ext, baseName, sourcePath } = splitFile;
    let sequenceNumber = generateSequenceNumber(
      numericTransform!,
      indexWithBase
    );

    const stringifiedNum = generatePaddedNumber(sequenceNumber, listLength);
    const rename = composeRenameString({
      baseName,
      ext,
      newName: stringifiedNum,
      preserveOriginal,
      customText,
      textPosition,
      separator,
      truncate,
    });
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

export const checkBaseIndex = (
  providedIndex: string | undefined
): number | null => {
  if (!(providedIndex && providedIndex.length)) return null;
  const stringToNum = Number(providedIndex);
  if (Number.isNaN(stringToNum)) return null;
  return Math.floor(stringToNum);
};
