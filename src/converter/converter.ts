import { rename, readdir, writeFile, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import {resolve} from "path";
import { MIN_NUMBER_LENGTH, ROLLBACK_FILE_NAME } from "./constants";
import type {
  EvenOddTransform,
  ExtractBaseAndExt,
  GenerateRenameList,
  RenameList,
  RenameListArgs,
} from "../types";

export const renameFiles = async (args: RenameListArgs): Promise<void> => {
  try {
    const { transformPattern } = args;
    const splitFileList = await listFiles().then((fileList) =>
      extractBaseAndExt(fileList)
    );
    const transformedNames = generateRenameList({...args, splitFileList});
    console.log("Writing rollback file...");
    await writeFile(
      resolve(process.cwd(), ROLLBACK_FILE_NAME),
      JSON.stringify(transformedNames, undefined, 2),
      "utf-8"
    );
    const batchRename: Promise<void>[] = [];
    transformedNames.forEach((transformName) =>
      batchRename.push(rename(transformName.original, transformName.rename))
    );
    console.log(
      `Renaming ${batchRename.length} files to ${transformPattern}...`
    );
    await Promise.all(batchRename);
    console.log("Completed!");
  } catch (err) {
    console.log(
      "An error ocurred while trying to perform the renaming function!"
    );
    console.error(err);
  }
};

export const listFiles = async (): Promise<string[]> => {
  const currentDir = process.cwd();
  const dirContent = await readdir(currentDir, { withFileTypes: true });
  const files = dirContent
    .filter(
      (dirEntry) => dirEntry.isFile() && dirEntry.name !== ROLLBACK_FILE_NAME
    )
    .map((fileDirEntry) => fileDirEntry.name);
  return files;
};

/**Will separate the basename and file extension. If no extension is found, it will
 * return the whole file name under the base property and an empty ext string
 */
export const extractBaseAndExt: ExtractBaseAndExt = (fileList) => {
  const regex = /(\.\w+)$/;
  return fileList.map((file) => {
    const extPosition = file.search(regex);
    if (extPosition !== -1) {
      return {
        baseName: file.slice(0, extPosition),
        ext: file.slice(extPosition),
      };
    }
    return { baseName: file, ext: "" };
  });
};

/**General renaming function that will call relevant transformer. Currently, it will just call the evenOddTransform, but it could also support other transform types or custom transform functions */
export const generateRenameList: GenerateRenameList = (args) => {
  const { splitFileList, transformPattern } = args;
  const isEvenOddTransform = ["even", "odd"].some((pattern) =>
    transformPattern.includes(pattern)
  );
  if (isEvenOddTransform) {
    return evenOddTransform(args);
  }
  // Return list with no transform
  return splitFileList.map((splitFile) => {
    const { ext, baseName } = splitFile;
    const completeFile = baseName + ext;
    return { rename: completeFile, original: completeFile };
  });
};

/**Return a list of odd|even names, along with original file names */
export const evenOddTransform: EvenOddTransform = (args) => {
  const { splitFileList, transformPattern, appendName, preserveOriginal } =
    args;
  return splitFileList.map((splitFile, index) => {
    const { ext, baseName } = splitFile;
    let sequenceNumber = index * 2;
    if (transformPattern === "odd") sequenceNumber += 1;
    if (transformPattern === "even") sequenceNumber += 2;

    let stringifiedNum = sequenceNumber.toString();
    const diffToMinLength = MIN_NUMBER_LENGTH - stringifiedNum.length;
    if (diffToMinLength > 0) {
      const prePend = new Array(diffToMinLength).fill("0").join("");
      stringifiedNum = prePend + stringifiedNum;
    }
    let finalRename = `${stringifiedNum}${ext}`;
    const append = preserveOriginal ? baseName : appendName ? appendName : "";
    finalRename = append
      ? `${stringifiedNum}-${append}${ext}`
      : `${stringifiedNum}${ext}`;
    return { rename: finalRename, original: baseName + ext };
  });
};

export const cleanUpRollbackFile = async (): Promise<void> => {
  try {
    const targetPath = resolve(process.cwd(), ROLLBACK_FILE_NAME);
    const rollBackFileExists = existsSync(targetPath);
    if (!rollBackFileExists) {
      console.log("No rollback file exists. Exiting.");
      return;
    }
    process.stdout.write("Deleting rollback file...");
    await unlink(targetPath);
    process.stdout.write("DONE!");
  } catch (err) {
    process.stdout.write("FAILED!");
    console.error(err);
  }
};

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

export const dryRunTransform = async (
  args: RenameListArgs
): Promise<void> => {
  try {
    const splitFileList = await listFiles().then((fileList) =>
      extractBaseAndExt(fileList)
    );
    const transformedNames = generateRenameList({...args, splitFileList});
    transformedNames.forEach((name) =>
      console.log(`${name.original} --> ${name.rename}`)
    );
  } catch (err) {
    console.log(
      "An error ocurred while trying to perform the dry-run of the renaming function!"
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
