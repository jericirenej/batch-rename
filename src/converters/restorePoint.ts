import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { STATUS } from "../messages/statusMessages.js";
import type {
  RenameList,
  RestoreBaseFunction,
  RestoreOriginalFileNames
} from "../types";
import {
  cleanUpRollbackFile,
  createBatchRenameList,
  determineDir,
  listFiles
} from "./utils.js";

const { couldNotBeParsed, noFilesToConvert, noRollbackFile, noValidData } =
  ERRORS.restore;

export const restoreBaseFunction: RestoreBaseFunction = async (
  transformPath
) => {
  const targetDir = determineDir(transformPath);
  const targetPath = join(targetDir, ROLLBACK_FILE_NAME);
  const existingFiles = await listFiles(targetDir, undefined, "all");
  if (!existingFiles.length) {
    throw new Error(noFilesToConvert);
  }
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    throw new Error(noRollbackFile);
  }
  const readRollback = await readFile(targetPath, "utf8");
  const rollbackData = JSON.parse(readRollback) as RenameList;

  const missingFiles: string[] = [];
  rollbackData.forEach((info) => {
    const { rename } = info;
    const targetFilePresent = existingFiles.includes(rename);
    if (!targetFilePresent) missingFiles.push(rename);
  });
  const filesToRestore = existingFiles.filter(
    (file) => !missingFiles.includes(file)
  );
  return { rollbackData, existingFiles, missingFiles, filesToRestore };
};

/**Restore original filenames on the basis of the rollbackFile */
export const restoreOriginalFileNames: RestoreOriginalFileNames = async ({
  dryRun,
  transformPath,
}) => {
  if (dryRun) return await dryRunRestore(transformPath);
  const targetDir = determineDir(transformPath);
  const restoreBaseData = await restoreBaseFunction(targetDir);
  if (!restoreBaseData) throw new Error(noValidData);
  const { rollbackData, missingFiles, filesToRestore } = restoreBaseData;

  let batchRename: Promise<void>[] = [];
  if (filesToRestore.length) {
    batchRename = createBatchRenameList(rollbackData, filesToRestore);
  }
  if (missingFiles.length) {
    if (!batchRename.length) {
      throw new Error(couldNotBeParsed);
    } else {
      console.log(STATUS.restore.restoreMissingFiles);
      missingFiles.map((file) => console.log(file));
    }
  }
  if (batchRename.length) {
    const revertMessage = `Will revert ${batchRename.length} files...`;
    console.log(revertMessage);
    await Promise.all(batchRename);
    await cleanUpRollbackFile({ transformPath });
  }
};

export const dryRunRestore = async (transformPath?: string): Promise<void> => {
  const restoreData = await restoreBaseFunction(transformPath);
  const { missingFiles, rollbackData, filesToRestore } = restoreData;
  if (!filesToRestore.length) {
    throw new Error(couldNotBeParsed);
  }
  const revertMessage = `Will revert ${filesToRestore.length} files...`;
  console.log(revertMessage);
  filesToRestore.forEach((file) => {
    const target = rollbackData.find((restore) => restore.rename === file);
    if (target) {
      console.log(`${file} --> ${target.original}`);
    }
  });

  if (missingFiles.length) {
    console.log(STATUS.restore.restoreMissingFiles);
    missingFiles.forEach((file) => console.log(file));
  }
};
