import type { BaseRenameItem, NumericTransform } from "@batch-rename/lib";
import { VALID_NUMERIC_TRANSFORM_TYPES as numericTransformFunctions } from "@batch-rename/lib";
import { composeRenameString } from "../utils/utils.js";

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
  const baseNumber = Number(providedIndex);
  if (Number.isNaN(baseNumber)) return null;
  if (baseNumber < 0) return null;
  return Math.floor(baseNumber);
};

export const generateSequenceNumber = (
  transformType: typeof numericTransformFunctions[number],
  sequenceNumber: number,
  baseIndex: number | null
): number => {
  if (transformType === "odd") return 2 * sequenceNumber + 1;
  if (transformType === "even") return 2 * (sequenceNumber + 1);
  if (baseIndex === null) {
    return sequenceNumber + 1;
  }
  return sequenceNumber;
};


/** Return a list of odd|even names, along with original file names */
export const numericTransform: NumericTransform = ({
  splitFileList,
  addText,
  textPosition,
  preserveOriginal,
  numericTransform,
  separator,
  truncate,
  baseIndex: baseIndexArg,
  format,
  noExtensionPreserve,
}) => {
  const baseIndex = checkBaseIndex(baseIndexArg);
  const listLength = baseIndex
    ? (baseIndex + splitFileList.length).toString().length
    : splitFileList.length.toString().length;
  return splitFileList.map((splitFile, index) => {
    const indexWithBase = baseIndex ? baseIndex + index : index;
    const { ext, baseName } = splitFile;
    const sequenceNumber = generateSequenceNumber(
      numericTransform!,
      indexWithBase,
      baseIndex
    );

    const stringifiedNum = generatePaddedNumber(sequenceNumber, listLength);
    const rename = composeRenameString({
      baseName,
      ext,
      newName: stringifiedNum,
      preserveOriginal,
      addText,
      textPosition,
      separator,
      truncate,
      format,
      noExtensionPreserve,
    });
    const renameItem:BaseRenameItem = { rename, original: baseName + ext }
    return renameItem;
  });
};
