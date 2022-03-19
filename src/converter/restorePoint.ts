import { existsSync } from "fs";
import { readFile, rename } from "fs/promises";
import { resolve } from "path";
import type { RenameList } from "../types";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import { cleanUpRollbackFile, listFiles } from "./converter.js";

const restoreBaseFunction = async (): Promise<{
  rollbackData: RenameList;
  existingFiles: string[];
  missingFiles: string[];
  filesToRestore: string[];
} | void> => {
  const targetPath = resolve(process.cwd(), ROLLBACK_FILE_NAME);
  const existingFiles = await listFiles();
  if (!existingFiles.length) {
    return console.log("There are no files available to convert!");
  }
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    console.log(
      "Rollback file not found. Restore to original file names not possible."
    );
    return;
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
export const restoreOriginalFileNames = async (): Promise<void> => {
  try {
    const restoreBaseData = await restoreBaseFunction();
    if (!restoreBaseData) throw new Error();
    const { rollbackData, missingFiles, filesToRestore } = restoreBaseData;

    const batchRename: Promise<void>[] = [];
    if (filesToRestore.length) {
      filesToRestore.forEach(async (file) => {
        const targetName = rollbackData.find(
          (rollbackInfo) => rollbackInfo.rename === file
        );
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { original } = targetName!;
        const currentPath = resolve(process.cwd(), file);
        const newPath = resolve(process.cwd(), original);
        return batchRename.push(rename(currentPath, newPath));
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
      console.log("Removing rollback file...");
      await cleanUpRollbackFile();
    }
  } catch (err) {
    console.log(
      "An unexpected error ocurred while trying to restore original file names!"
    );
    console.error(err);
  }
};

export const dryRunRestore = async () => {
  try {
    const restoreData = await restoreBaseFunction();
    if (!restoreData) throw Error();
    const { missingFiles, rollbackData, filesToRestore } =
      restoreData;
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
      console.log("Restore data could not be parsed for any of the files!");
      return;
    }
    if (missingFiles.length) {
      console.log("The following files did not have restore data available:");
      missingFiles.map((file) => console.log(file));
      return;
    }
  } catch (err) {
    console.error(err);
  }
};