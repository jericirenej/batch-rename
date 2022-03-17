import {
  cleanUpRollbackFile,
  dryRunTransform,
  renameFiles,
} from "../converter/converter";
import { dryRunRestore, restoreOriginalFileNames } from "../converter/restorePoint";
import type { RenameListArgs, TransformTypes } from "../types";
import { validTransformTypes } from "../types";
import { OptionKeysWithValues } from "./programOptions";

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
      validTransformTypes.some((transformType) => transformType === key) &&
      options[key]
  );
  const numOfTransformations = transformationPicked.length;
  if (!numOfTransformations) {
    console.log(
      `No transformation operation picked! Please specify one of the following: ${validTransformTypes.join(
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
