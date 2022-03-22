import type {
  RenameList,
  RestoreBaseFunction,
  RestoreOriginalFileNames,
} from "../types";

import { existsSync } from "fs";
import { readFile, rename } from "fs/promises";
import { join } from "path";

import { ROLLBACK_FILE_NAME } from "../constants.js";
import { cleanUpRollbackFile, determineDir, listFiles } from "./utils.js";

const restoreBaseFunction: RestoreBaseFunction = async (transformPath) => {
  const targetDir = determineDir(transformPath);
  const targetPath = join(targetDir, ROLLBACK_FILE_NAME);
  const existingFiles = await listFiles(targetDir);
  if (!existingFiles.length) {
    throw new Error("There are no files available to convert!");
  }
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    throw new Error(
      "Rollback file not found. Restore to original file names not possible."
    );
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
  if (!restoreBaseData) throw new Error();
  const { rollbackData, missingFiles, filesToRestore } = restoreBaseData;

  const batchRename: Promise<void>[] = [];
  if (filesToRestore.length) {
    filesToRestore.forEach(async (file) => {
      const targetName = rollbackData.find((rollbackInfo) => {
        const { rename, original } = rollbackInfo;
        return rename === file && original !== rename;
      });
      if (targetName) {
        const { original } = targetName;
        const currentPath = join(targetName.sourcePath, file);
        const newPath = join(targetName.sourcePath, original);
        return batchRename.push(rename(currentPath, newPath));
      }
    });
  }
  if (missingFiles.length) {
    if (!batchRename.length) {
      console.log("Restore data could not be parsed for any of the files!");
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
  if (!restoreData) throw Error();
  const { missingFiles, rollbackData, filesToRestore } = restoreData;
  if (filesToRestore.length) {
    console.log("Will convert", filesToRestore.length, "files...");
    filesToRestore.forEach((file) => {
      const target = rollbackData.find((restore) => restore.rename === file);
      if (target) {
        console.log(`${file} --> ${target.original}`);
      }
    });
  }
  if (!filesToRestore.length) {
    throw new Error("Restore data could not be parsed for any of the files!");
  }
  if (missingFiles.length) {
    console.log("The following files did not have restore data available:");
    missingFiles.map((file) => console.log(file));
    return;
  }
};
