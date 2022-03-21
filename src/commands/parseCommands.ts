import { renameFiles } from "../converter/converter.js";
import program from "./generateCommands.js";
import type {
  RenameListArgs,
  TransformTypes,
  OptionKeysWithValues,
  DateTransformOptions,
  UtilityActionsCheck,
  UtilityActions,
} from "../types";
import {
  utilityActionsCorrespondenceTable,
  UTILITY_ACTIONS,
  VALID_TRANSFORM_TYPES,
} from "../constants.js";

import { checkPath } from "../converter/utils.js";

export const parseOptions = async (options: OptionKeysWithValues) => {
  try {
    if (!Object.keys(options).length) return program.help();

    const {
      appendName,
      preserveOriginal,
      dryRun,
      dateRename,
      detailedDate,
      searchAndReplace,
      folderPath,
    } = options;

    let transformPath: string | undefined;
    if (folderPath) {
      transformPath = await checkPath(folderPath as string);
    }
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
      appendName: appendName as string | undefined,
      transformPattern,
      preserveOriginal: transformedPreserve,
      dateRename: dateRename as DateTransformOptions,
      detailedDate: detailedDate as boolean | undefined,
      dryRun: dryRun as boolean | undefined,
      searchAndReplace: searchAndReplace as string[] | undefined,
      transformPath,
    };
    return await renameFiles(args);
  } catch (err) {
    const error = err as Error;
    console.error(error.message);
    process.exit(1);
  }
};

const transformationCheck = (options: OptionKeysWithValues): TransformTypes => {
  const keys = Object.keys(options) as unknown as Array<keyof typeof options>;
  const transformationPicked = keys.filter(
    (key) =>
      VALID_TRANSFORM_TYPES.some((transformType) => transformType === key) &&
      options[key]
  );
  const numOfTransformations = transformationPicked.length;
  if (!numOfTransformations) {
    throw new Error(
      `No transformation operation picked! Please specify one of the following: ${VALID_TRANSFORM_TYPES.join(
        ", "
      )}.`
    );
  }
  if (numOfTransformations > 1) {
    throw new Error("You can only pick one transformation type!");
  }
  return transformationPicked[0] as TransformTypes;
};

const utilityActionsCheck: UtilityActionsCheck = (options) => {
  const keys = Object.keys(options) as UtilityActions[];
  const utilityActions = keys.filter((key) =>
    UTILITY_ACTIONS.some((action) => action === key)
  );
  if (utilityActions.length > 1) {
    throw new Error(`Only one type of utility action can be executed at the time!
    Chosen: ${JSON.stringify(utilityActions)}.
    Available: ${JSON.stringify(UTILITY_ACTIONS)}.
    `);
  }
  return utilityActions[0];
};
