import type {
  DryRunRestore,
  RenameItemsArray,
  RestoreBaseFunction,
  RestoreOriginalFileNames
} from "@batch-rename/lib";
import {
  ERRORS, ROLLBACK_FILE_NAME, STATUS, VALID_DRY_RUN_ANSWERS, determineDir,
  listFiles,
} from "@batch-rename/lib";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import {
  checkExistingFiles,
  checkRestoreFile,
  determineRollbackLevel,
  restoreByLevels
} from "../utils/restoreUtils.js";
import { trimRollbackFile } from "../utils/rollbackUtils.js";
import {
  askQuestion,
  createBatchRenameList,
  settledPromisesEval
} from "../utils/utils.js";

const { couldNotBeParsed, noFilesToConvert, noRollbackFile, noValidData } =
  ERRORS.restore;


export const restoreBaseFunction: RestoreBaseFunction = async (
  transformPath,
  rollbackLevel
) => {
  const targetDir = determineDir(transformPath);
  const targetPath = join(targetDir, ROLLBACK_FILE_NAME);
  const existingFiles = await listFiles(targetDir, undefined, "all").then(
    (files) => files.map((file) => file.name)
  );
  if (!existingFiles.length) {
    throw new Error(noFilesToConvert);
  }
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    throw new Error(noRollbackFile);
  }
  const readRollback = await readFile(targetPath, "utf8");
  const originalRollbackData = JSON.parse(readRollback);

  const rollbackData = checkRestoreFile(originalRollbackData);
  const targetRollback = determineRollbackLevel({
    transformList: rollbackData.transforms,
    rollbackLevel,
  });

  const { filesToRestore, missingFiles } = checkExistingFiles({
    existingFiles,
    transforms: rollbackData.transforms,
    rollbackLevel: targetRollback,
  });
  const restoreList = restoreByLevels({
    rollbackFile: rollbackData,
    rollbackLevel,
  });

  return {
    rollbackData,
    restoreList,
    existingFiles,
    missingFiles,
    filesToRestore,
  };
};


export const dryRunRestore: DryRunRestore = async ({
  filesToRestore,
  missingFiles,
  restoreList: { transforms },
}) => {
  const missingLength = missingFiles.length;
  const tableData = transforms.map(({ rename, original }) => ({
    current: rename,
    restored: original,
  }));
  console.log(STATUS.restoreMessage(filesToRestore.length));
  console.table(tableData, ["current", "restored"]);
  if (missingLength) {
    console.log(STATUS.restoreWarningMissingFiles(missingLength));
    console.log(missingFiles);
  }
  const response = await askQuestion(STATUS.questionPerformRestore);
  if (VALID_DRY_RUN_ANSWERS.includes(response.toLocaleLowerCase())) return true;
  console.log(STATUS.exitWithoutRestore);
  return false;
};


/** Restore original filenames on the basis of the rollbackFile */
export const restoreOriginalFileNames: RestoreOriginalFileNames = async ({
  dryRun,
  transformPath,
  rollbackLevel,
}) => {
  const targetDir = determineDir(transformPath);
  const restoreBaseData = await restoreBaseFunction(targetDir, rollbackLevel);
  if (!restoreBaseData) throw new Error(noValidData);
  if (!restoreBaseData.filesToRestore.length) {
    throw new Error(couldNotBeParsed);
  }
  if (dryRun) {
    const dryRun = await dryRunRestore(restoreBaseData);
    if (!dryRun) return;
  }
  const { filesToRestore, restoreList } = restoreBaseData;
  const { targetLevel, transforms } = restoreList;

  let batchRename: Promise<void>[] = [],
    updatedRenameList: RenameItemsArray = [];
  if (filesToRestore.length) {
    batchRename = createBatchRenameList({
      transforms,
      sourcePath: targetDir,
      filesToRestore,
    });
  }
  if (!batchRename.length) {
    throw new Error(couldNotBeParsed);
  }
  if (batchRename.length) {
    updatedRenameList = transforms.filter(({ rename }) =>
      filesToRestore.includes(rename)
    );

    console.log(`Will revert ${batchRename.length} files...`);
    const promiseResults = await Promise.allSettled(batchRename);

    const { failed } = settledPromisesEval({
      promiseResults,
      transformedNames: updatedRenameList,
      operationType: "restore",
    });

    await trimRollbackFile({ sourcePath: targetDir, targetLevel, failed });
  }
};