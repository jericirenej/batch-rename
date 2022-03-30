import type {
  RenameList,
  RestoreBaseFunction,
  RestoreOriginalFileNames,
} from "../types";

import { existsSync } from "fs";
import { readFile, rename } from "fs/promises";
import { join } from "path";

import { ROLLBACK_FILE_NAME } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { cleanUpRollbackFile, createBatchRenameList, determineDir, listFiles } from "./utils.js";

const {
  RESTORE_COULD_NOT_BE_PARSED,
  RESTORE_NO_FILES_TO_CONVERT,
  RESTORE_NO_ROLLBACK_FILE_TO_CONVERT,
  RESTORE_NO_VALID_DATA,
} = ERRORS;

export const restoreBaseFunction: RestoreBaseFunction = async (
  transformPath
) => {
  const targetDir = determineDir(transformPath);
  const targetPath = join(targetDir, ROLLBACK_FILE_NAME);
  const existingFiles = await listFiles(targetDir);
  if (!existingFiles.length) {
    throw new Error(RESTORE_NO_FILES_TO_CONVERT);
  }
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    throw new Error(RESTORE_NO_ROLLBACK_FILE_TO_CONVERT);
  }
  const rollbackData = JSON.parse(
    await readFile(targetPath, "utf8")
  ) as RenameList;

  const missingFiles: string[] = [];
  existingFiles.forEach((file) => {
    const targetName = rollbackData.find(
      (rollbackInfo) => rollbackInfo.rename === file
    );
    if (!targetName) missingFiles.push(file);
  });
  const filesToRestore = existingFiles.filter(
    (file) => !missingFiles.includes(file)
  );
  return { rollbackData, existingFiles, missingFiles, filesToRestore };
};

/**Restore original filenames on the basis of the rollbackFile */
export const restoreOriginalFileNames: RestoreOriginalFileNames = async (
  args
) => {
  const { dryRun, transformPath } = args;
  if (dryRun) return await dryRunRestore(transformPath);
  const targetDir = determineDir(transformPath);
  const restoreBaseData = await restoreBaseFunction(targetDir);
  if (!restoreBaseData) throw new Error(RESTORE_NO_VALID_DATA);
  const { rollbackData, missingFiles, filesToRestore } = restoreBaseData;

  let batchRename: Promise<void>[] = [];
  if (filesToRestore.length) {
    batchRename = createBatchRenameList(rollbackData, filesToRestore);
  }
  if (missingFiles.length) {
    if (!batchRename.length) {
      throw new Error(RESTORE_COULD_NOT_BE_PARSED);
    } else {
      console.log("The following files did not have restore data available:");
      missingFiles.map((file) => console.log(file));
    }
  }
  if (batchRename.length) {
    console.log("Will convert", batchRename.length, "files...");
    await Promise.all(batchRename);
    await cleanUpRollbackFile({ transformPath });
  }
};

export const dryRunRestore = async (transformPath?: string): Promise<void> => {
  const restoreData = await restoreBaseFunction(transformPath);
  const { missingFiles, rollbackData, filesToRestore } = restoreData;
  if (!filesToRestore.length) {
    throw new Error(RESTORE_COULD_NOT_BE_PARSED);
  }
  console.log("Will convert", filesToRestore.length, "files...");
  filesToRestore.forEach((file) => {
    const target = rollbackData.find((restore) => restore.rename === file);
    if (target) {
      console.log(`${file} --> ${target.original}`);
    }
  });

  if (missingFiles.length) {
    console.log("The following files did not have restore data available:");
    missingFiles.map((file) => console.log(file));
    return;
  }
};
