import { rename, readdir, writeFile, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { MIN_NUMBER_LENGTH, ROLLBACK_FILE_NAME } from "./constants";
import {
  ExtractBaseAndExt,
  ExtractBaseAndExtReturn,
  GenerateRenameList,
  RenameList,
  TransformTypes,
} from "./types";
import { updateIf } from "typescript";
export const renameFiles = async (
  transformType: TransformTypes
): Promise<void> => {
  try {
    const splitFiles = await listFiles().then((fileList) =>
      extractBaseAndExt(fileList)
    );
    const transformedNames = generateRenameList(splitFiles, transformType);
    console.log("Writing rollback file...");
    await writeFile(
      path.resolve(process.cwd(), ROLLBACK_FILE_NAME),
      JSON.stringify(transformedNames, undefined, 2),
      "utf-8"
    );
    const batchRename: Promise<void>[] = [];
    transformedNames.forEach((transformName) =>
      batchRename.push(rename(transformName.original, transformName.rename))
    );
    console.log(`Renaming ${batchRename.length} files to ${transformType}...`);
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
export const generateRenameList: GenerateRenameList = (
  splitFileList,
  transformPattern
) => {
  const isEvenOddTransform = ["even", "odd"].some((pattern) =>
    transformPattern.includes(pattern)
  );
  if (isEvenOddTransform) {
    return evenOddTransform(splitFileList, transformPattern);
  }
  // Return list with no transform
  return splitFileList.map((splitFile) => {
    const { ext, baseName } = splitFile;
    const completeFile = baseName + ext;
    return { rename: completeFile, original: completeFile };
  });
};

/**Return a list of odd|even names, along with original file names */
export const evenOddTransform = (
  splitFileList: ExtractBaseAndExtReturn,
  transformPattern: TransformTypes
) => {
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
    return { rename: `${stringifiedNum}${ext}`, original: baseName + ext };
  });
};

export const cleanUpRollbackFile = async (): Promise<void> => {
  try {
    const targetPath = path.resolve(process.cwd(), ROLLBACK_FILE_NAME);
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

/**Restore original filenames on the basis of the rollbackFile */
export const restoreOriginalFileNames = async (): Promise<void> => {
  try {
    const targetPath = path.resolve(process.cwd(), ROLLBACK_FILE_NAME);
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
    const missingData: string[] = [];
    const batchRename: Promise<void>[] = [];
    existingFiles.forEach(async (file) => {
      const targetName = rollbackData.find(
        (rollbackInfo) => rollbackInfo.rename === file
      );
      if (targetName) {
        const { original } = targetName;
        const currentPath = path.resolve(process.cwd(), file);
        const newPath = path.resolve(process.cwd(), original);
        return batchRename.push(rename(currentPath, newPath));
      } else {
        missingData.push(file);
      }
    });
    if (missingData.length) {
      if (!batchRename.length) {
        console.log("Restore data could not be parsed for any of the files!");
      } else {
        console.log("The following files did not have restore data available:");
        missingData.map((file) => console.log(file));
      }
    }
    if (batchRename.length) {
      console.log("Will convert", batchRename.length, "files...");
      await Promise.all(batchRename);
      console.log("Removing rollback file...");
      await cleanUpRollbackFile();
    }
  } catch (err) {
    console.log("An unexpected error ocurred!");
    console.error(err);
  }
};

// (async () => await cleanUpRollbackFile())();

 // (async () => await restoreOriginalFileNames())();
 // (async () => await renameFiles("even"))();

