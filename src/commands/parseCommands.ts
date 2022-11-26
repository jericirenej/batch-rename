import objectFilter from "@jericirenej/object-filter";
import {
  EXCLUDED_CONVERT_OPTIONS,
  UTILITY_ACTIONS,
  VALID_TRANSFORM_TYPES
} from "../constants.js";
import { convertFiles } from "../converters/converter.js";
import { restoreOriginalFileNames } from "../converters/restorePoint.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  OptionKeysWithValues,
  OptionKeysWithValuesAndRestArgs,
  RenameListArgs,
  SetTransformationPath,
  TransformTypes,
  UtilityActions,
  UtilityActionsCheck,
  UtilityFunctionsArgs
} from "../types";
import { checkPath, deleteRollbackFile, parseRestoreArg } from "../utils/utils.js";
import program from "./generateCommands.js";

const { noTransformationPicked, onlyOneUtilAction } = ERRORS.transforms;

export const parseOptions = async (
  options: OptionKeysWithValuesAndRestArgs
) => {
  try {
    if (!Object.keys(options).length) return program.help();
    const { preserveOriginal, dryRun, target, restore, restArgs } = options;

    const transformPath = await setTransformationPath(
      target as string | undefined,
      restArgs
    );

    const rollbackLevel = parseRestoreArg(restore);

    // Run util actions first.
    const utilityActions = utilityActionsCheck(options);
    if (utilityActions) {
      return await utilityActionsCorrespondenceTable[utilityActions]({
        dryRun: dryRun as boolean | undefined,
        transformPath,
        rollbackLevel,
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

    const args = objectFilter({
      targetObject: options,
      filters: EXCLUDED_CONVERT_OPTIONS,
      filterType: "exclude",
    });
    args.preserveOriginal = transformedPreserve;
    args.transformPattern = transformPattern;
    args.transformPath = transformPath;
    return await convertFiles(args as RenameListArgs);
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
    throw new Error(noTransformationPicked);
  }
  return transformationPicked as TransformTypes[];
};

export const setTransformationPath: SetTransformationPath = async (
  folder,
  restArgs
) => {
  if (folder) {
    return await checkPath(folder);
  }
  if (Array.isArray(restArgs) && restArgs.length) {
    return await checkPath(restArgs[0]);
  }
  return undefined;
};

export const utilityActionsCorrespondenceTable = {
  restore: (args: UtilityFunctionsArgs) => restoreOriginalFileNames(args),
  cleanRollback: ({ transformPath }: UtilityFunctionsArgs) =>
    deleteRollbackFile(transformPath),
};

export const utilityActionsCheck: UtilityActionsCheck = (options) => {
  const keys = Object.keys(options) as UtilityActions[];
  const utilityActions = keys.filter((key) =>
    UTILITY_ACTIONS.some((action) => action === key)
  );
  if (utilityActions.length > 1) {
    throw new Error(`${onlyOneUtilAction}
    Chosen: ${JSON.stringify(utilityActions)}.
    Available: ${JSON.stringify(UTILITY_ACTIONS)}.
    `);
  }
  return utilityActions[0];
};
