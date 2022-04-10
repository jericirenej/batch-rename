import { convertFiles } from "../converters/converter.js";
import program from "./generateCommands.js";
import type {
  RenameListArgs,
  TransformTypes,
  OptionKeysWithValues,
  DateTransformOptions,
  UtilityActionsCheck,
  UtilityActions,
  OptionKeysWithValuesAndRestArgs,
  SetTransformationPath,
} from "../types";
import {
  UTILITY_ACTIONS,
  VALID_TRANSFORM_TYPES,
  VALID_NUMERIC_TRANSFORM_TYPES,
  INCLUSIVE_TRANSFORM_TYPES,
} from "../constants.js";

import { utilityActionsCorrespondenceTable } from "./programConfiguration.js";

import { checkPath } from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";

const {
  COMMAND_NO_TRANSFORMATION_PICKED,
  COMMAND_ONLY_ONE_EXCLUSIVE_TRANSFORM,
  COMMAND_ONLY_ONE_UTILITY_ACTION,
} = ERRORS;

export const parseOptions = async (
  options: OptionKeysWithValuesAndRestArgs
) => {
  try {
    if (!Object.keys(options).length) return program.help();

    const {
      customText,
      separator,
      textPosition,
      preserveOriginal,
      dryRun,
      dateRename,
      detailedDate,
      searchAndReplace,
      folderPath,
      numericTransform,
      truncate,
      baseIndex,
      exclude,
      restArgs,
    } = options;

    const transformPath = await setTransformationPath(
      folderPath as string | undefined,
      restArgs
    );
    // Run util actions first.
    const utilityActions = utilityActionsCheck(options);
    if (utilityActions) {
      return await utilityActionsCorrespondenceTable[utilityActions]({
        dryRun: dryRun as boolean | undefined,
        transformPath,
      });
    }
    const transformPattern = transformationCheck(options);

    let transformedPreserve: boolean;
    try {
      transformedPreserve = JSON.parse(
        (preserveOriginal as string).toLowerCase()
      ) as boolean;
    } catch {
      transformedPreserve = true;
    }
    const args: RenameListArgs = {
      customText: customText as string | undefined,
      transformPattern,
      preserveOriginal: transformedPreserve,
      dateRename: dateRename as DateTransformOptions,
      detailedDate: detailedDate as boolean | undefined,
      dryRun: dryRun as boolean | undefined,
      searchAndReplace: searchAndReplace as string[] | undefined,
      transformPath,
      numericTransform: numericTransform as
        | typeof VALID_NUMERIC_TRANSFORM_TYPES[number]
        | undefined,
      separator: separator as string | undefined,
      textPosition: textPosition as "append" | "prepend" | undefined,
      truncate: truncate as "string" | undefined,
      baseIndex: baseIndex as "string" | undefined,
      exclude: exclude as "string" | undefined,
    };
    return await convertFiles(args);
  } catch (err) {
    const error = err as Error;
    console.error(error.message);
    process.exit(1);
  }
};

const transformationCheck = (
  options: OptionKeysWithValues
): TransformTypes[] => {
  const keys = Object.keys(options) as unknown as Array<keyof typeof options>;
  const transformationPicked = keys.filter(
    (key) =>
      VALID_TRANSFORM_TYPES.some((transformType) => transformType === key) &&
      options[key]
  );
  const numOfTransformations = transformationPicked.length;
  const numOfExclusiveTransformations = transformationPicked.filter(
    (transformationType) =>
      !INCLUSIVE_TRANSFORM_TYPES.some(
        (inclusiveType) => inclusiveType === transformationType
      )
  ).length;
  if (!numOfTransformations) {
    throw new Error(COMMAND_NO_TRANSFORMATION_PICKED);
  }
  if (numOfExclusiveTransformations > 1) {
    throw new Error(COMMAND_ONLY_ONE_EXCLUSIVE_TRANSFORM);
  }
  return transformationPicked as TransformTypes[];
};

export const setTransformationPath: SetTransformationPath = async (
  folderPath,
  restArgs
) => {
  if (folderPath) {
    return await checkPath(folderPath);
  }
  if (Array.isArray(restArgs) && restArgs.length) {
    return await checkPath(restArgs[0]);
  }
  return undefined;
};

export const utilityActionsCheck: UtilityActionsCheck = (options) => {
  const keys = Object.keys(options) as UtilityActions[];
  const utilityActions = keys.filter((key) =>
    UTILITY_ACTIONS.some((action) => action === key)
  );
  if (utilityActions.length > 1) {
    throw new Error(`${COMMAND_ONLY_ONE_UTILITY_ACTION}
    Chosen: ${JSON.stringify(utilityActions)}.
    Available: ${JSON.stringify(UTILITY_ACTIONS)}.
    `);
  }
  return utilityActions[0];
};
