import {
  cleanUpRollbackFile,
  dryRunTransform,
  renameFiles,
} from "../converter/converter.js";
import { dryRunRestore, restoreOriginalFileNames } from "../converter/restorePoint.js";
import type { RenameListArgs, TransformTypes } from "../types";
import { VALID_TRANSFORM_TYPES } from "../converter/constants.js";
import { OptionKeysWithValues } from "./programOptions.js";

export const parseOptions = async (options: OptionKeysWithValues) => {
  const { appendName, cleanRollback, dryRun, preserveOriginal, restore } =
    options;

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
  const args: RenameListArgs = {
    appendName: appendName as string | undefined,
    transformPattern,
    preserveOriginal: preserveOriginal as boolean | undefined,
  };
  if (dryRun) {
    console.log("DRY RUN");
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
