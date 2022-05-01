import {
  UTILITY_ACTIONS,
  VALID_TRANSFORM_TYPES
} from "../constants.js";
import { convertFiles } from "../converters/converter.js";
import { checkPath } from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  OptionKeysWithValues,
  OptionKeysWithValuesAndRestArgs,
  RenameListArgs,
  SetTransformationPath,
  TransformTypes,
  UtilityActions,
  UtilityActionsCheck
} from "../types";
import program from "./generateCommands.js";
import { utilityActionsCorrespondenceTable } from "./programConfiguration.js";

const {
  COMMAND_NO_TRANSFORMATION_PICKED,
  COMMAND_ONLY_ONE_UTILITY_ACTION,
} = ERRORS;

export const parseOptions = async (
  options: OptionKeysWithValuesAndRestArgs
) => {
  try {
    if (!Object.keys(options).length) return program.help();
    const {
      addText,
      separator,
      textPosition,
      preserveOriginal,
      noExtensionPreserve,
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
    const args = {
      addText,
      transformPattern,
      preserveOriginal: transformedPreserve,
      noExtensionPreserve,
      dateRename,
      detailedDate,
      dryRun,
      searchAndReplace,
      transformPath,
      numericTransform,
      separator,
      textPosition,
      truncate,
      baseIndex,
      exclude,
    } as RenameListArgs;
    return await convertFiles(args);
  } catch (err) {
    const error = err as Error;
    console.error(error.message);
    process.exit(1);
  }
};

export const transformationCheck = (
  options: OptionKeysWithValues
): TransformTypes[] => {
  const keys = Object.keys(options) as unknown as Array<keyof typeof options>;
  const transformationPicked = keys.filter(
    (key) =>
      VALID_TRANSFORM_TYPES.some((transformType) => transformType === key) &&
      options[key]
  );
  const numOfTransformations = transformationPicked.length;
  if (!numOfTransformations) {
    throw new Error(COMMAND_NO_TRANSFORMATION_PICKED);
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
