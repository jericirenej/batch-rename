import {
  cleanUpRollbackFile,
  dryRunTransform,
  renameFiles,
} from "../converter/converter.js";
import {
  dryRunRestore,
  restoreOriginalFileNames,
} from "../converter/restorePoint.js";
import type {
  RenameListArgs,
  TransformTypes,
  OptionKeysWithValues,
  DateTransformOptions,
} from "../types";
import { VALID_TRANSFORM_TYPES } from "../constants.js";

export const parseOptions = async (options: OptionKeysWithValues) => {
  const {
    appendName,
    cleanRollback,
    dryRun,
    preserveOriginal,
    restore,
    dateRename,
    detailedDate,
  } = options;
  if (restore) {
    if (dryRun) {
      await dryRunRestore();
      process.exit(0);
    }
    await restoreOriginalFileNames();
    process.exit(0);
  }

  if (cleanRollback) {
    await cleanUpRollbackFile();
    process.exit(0);
  }

  const transformPattern = transformationSanityCheck(options);
  const transformedPreserve = preserveOriginal
    ? (JSON.parse((preserveOriginal as string).toLowerCase()) as boolean)
    : true;
  const args: RenameListArgs = {
    appendName: appendName as string | undefined,
    transformPattern,
    preserveOriginal: transformedPreserve,
    dateRename: dateRename as DateTransformOptions,
    detailedDate: detailedDate as boolean | undefined,
  };
  // ! Don't forget to remove console.log("PARSED ARGS", args);
  if (dryRun) {
    await dryRunTransform(args);
    process.exit(0);
  }

  await renameFiles(args);
  process.exit(0);
};

const transformationSanityCheck = (
  options: OptionKeysWithValues
): TransformTypes => {
  const keys = Object.keys(options) as unknown as Array<keyof typeof options>;
  const transformationPicked = keys.filter(
    (key) =>
      VALID_TRANSFORM_TYPES.some((transformType) => transformType === key) &&
      options[key]
  );
  const numOfTransformations = transformationPicked.length;
  if (!numOfTransformations) {
    console.log(
      `No transformation operation picked! Please specify one of the following: ${VALID_TRANSFORM_TYPES.join(
        ", "
      )}.`
    );
    process.exit(1);
  }
  if (numOfTransformations > 1) {
    console.log("You can only pick one transformation type!");
    process.exit(1);
  }
  return transformationPicked[0] as TransformTypes;
};
