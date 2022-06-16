import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { ROLLBACK_FILE_NAME, VALID_DRY_RUN_ANSWERS } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { STATUS } from "../messages/statusMessages.js";
import type {
  DryRunRestore,
  RenameList,
  RestoreBaseFunction,
  RestoreOriginalFileNames
} from "../types";
import {
  askQuestion,
  cleanUpRollbackFile,
  createBatchRenameList,
  determineDir,
  listFiles
} from "./utils.js";

const { couldNotBeParsed, noFilesToConvert, noRollbackFile, noValidData } =
  ERRORS.restore;
const {
  restoreMessage,
  warningMissingFiles,
  exitWithoutRestore,
  questionPerformRestore,
} = STATUS.restore;

export const restoreBaseFunction: RestoreBaseFunction = async (
  transformPath
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
  const targetDir = determineDir(transformPath);
  const restoreBaseData = await restoreBaseFunction(targetDir);
  if (!restoreBaseData) throw new Error(noValidData);
  if (!restoreBaseData.filesToRestore.length) {
    throw new Error(couldNotBeParsed);
  }
  if (dryRun) {
    const dryRun = await dryRunRestore(restoreBaseData);
    if (!dryRun) return;
  }
  const { rollbackData, filesToRestore } = restoreBaseData;

  let batchRename: Promise<void>[] = [];
  if (filesToRestore.length) {
    batchRename = createBatchRenameList(rollbackData, filesToRestore);
  }
  if (!batchRename.length) {
    throw new Error(couldNotBeParsed);
  }
  if (batchRename.length) {
    const revertMessage = `Will revert ${batchRename.length} files...`;
    console.log(revertMessage);
    await Promise.all(batchRename);
    await cleanUpRollbackFile({ transformPath });
  }
};

export const dryRunRestore: DryRunRestore = async ({
  filesToRestore,
  missingFiles,
  rollbackData,
}) => {
  const missingLength = missingFiles.length;
  const tableData = rollbackData.map(({ rename, original }) => ({
    current: rename,
    restored: original,
  }));
  console.log(restoreMessage(filesToRestore.length));
  console.table(tableData, ["current", "restored"]);
  if (missingLength) {
    console.log(warningMissingFiles(missingLength));
    console.log(missingFiles);
  }
  const response = await askQuestion(questionPerformRestore);
  if (VALID_DRY_RUN_ANSWERS.includes(response.toLocaleLowerCase())) return true;
  console.log(exitWithoutRestore);
  return false;
};
