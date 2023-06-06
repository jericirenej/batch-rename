import objectFilter from "@jericirenej/object-filter";
import { EXCLUDED_CONVERT_OPTIONS, UTILITY_ACTIONS, VALID_TRANSFORM_TYPES } from "../constants.js";
import { convertFiles } from "../converters/converter.js";
import { restoreOriginalFileNames } from "../converters/restorePoint.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  OptionKeysWithValues,
  OptionKeysWithValuesAndRestArgs,
  RenameListArgs,
  SetTransformationPath,
  TransformTypes,
  UtilityActionArgs,
  UtilityActions,
  UtilityActionsCheck,
  UtilityFunctionsArgs,
} from "../types";
import { deleteRollbackFile } from "../utils/rollbackUtils.js";
import { checkPath, parseBoolOption, parseRestoreArg } from "../utils/utils.js";
import program from "./generateCommands.js";

const { noTransformationPicked, onlyOneUtilAction } = ERRORS.transforms;

export const utilityActionsCorrespondenceTable = {
  restore: (args: UtilityFunctionsArgs) => restoreOriginalFileNames(args),
  cleanRollback: ({ transformPath }: UtilityFunctionsArgs) => deleteRollbackFile(transformPath),
};

export const setTransformationPath: SetTransformationPath = async (folder, restArgs) => {
  if (folder) {
    return await checkPath(folder);
  }
  if (Array.isArray(restArgs) && restArgs.length) {
    return await checkPath(restArgs[0]);
  }
  return undefined;
};

export const transformationCheck = (options: OptionKeysWithValues): TransformTypes[] => {
  const keys = Object.keys(options) as unknown as Array<keyof typeof options>;
  const transformationPicked = keys.filter(
    (key) => VALID_TRANSFORM_TYPES.some((transformType) => transformType === key) && options[key]
  );
  const numOfTransformations = transformationPicked.length;
  if (!numOfTransformations) {
    throw new Error(noTransformationPicked);
  }
  return transformationPicked as TransformTypes[];
};

export const utilityActionsCheck: UtilityActionsCheck = (options) => {
  const keys = Object.keys(options) as UtilityActions[];
  const utilityActions = keys.filter((key) => UTILITY_ACTIONS.some((action) => action === key));
  if (utilityActions.length > 1) {
    throw new Error(`${onlyOneUtilAction}
    Chosen: ${JSON.stringify(utilityActions)}.
    Available: ${JSON.stringify(UTILITY_ACTIONS)}.
    `);
  }
  return utilityActions[0];
};

export const fireUtilityAction = async (
  action: Exclude<UtilityActions, undefined>,
  args: UtilityActionArgs
): Promise<void> => {
  return utilityActionsCorrespondenceTable[action](args);
};

export const parseOptions = async (options: OptionKeysWithValuesAndRestArgs) => {
  try {
    if (!Object.keys(options).length) return program.help();
    const {
      preserveOriginal: argPreserveOriginal,
      dryRun: argDryRun,
      skipRollback: argSkipRollback,
      target,
      restore,
      restArgs,
    } = options;

    // Default dryRun to true, unless specifically set to false
    const dryRun = parseBoolOption(argDryRun, true);

    // Default skipRollback to false, unless specifically set to false
    const skipRollback = parseBoolOption(argSkipRollback, false);

    const transformPath = await setTransformationPath(target as string | undefined, restArgs);

    const rollbackLevel = parseRestoreArg(restore);

    // Run util actions first.
    const utilityActions = utilityActionsCheck(options);
    if (utilityActions) {
      await fireUtilityAction(utilityActions, {
        dryRun,
        transformPath,
        rollbackLevel,
      });
      return;
    }
    const transformPattern = transformationCheck(options);

    const preserveOriginal = parseBoolOption(argPreserveOriginal, true);

    const args = objectFilter({
      targetObject: options,
      filters: EXCLUDED_CONVERT_OPTIONS,
      filterType: "exclude",
    });

    return await convertFiles({
      ...args,
      skipRollback,
      preserveOriginal,
      transformPattern,
      transformPath,
      dryRun,
    } as RenameListArgs);
  } catch (err) {
    const error = err as Error;
    console.error(error.message);
    process.exit(1);
  }
};
