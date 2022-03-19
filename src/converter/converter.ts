import { rename, readdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import type {
  ExtractBaseAndExt,
  GenerateRenameList,
  RenameListArgs,
  FileListWithStatsArray,
  ExtractBaseAndExtReturn,
} from "../types";
import { evenOddTransform } from "./evenOddTransform.js";
import { dateTransform, provideFileStats } from "./dateConverter.js";

export const renameFiles = async (args: RenameListArgs): Promise<void> => {
  try {
    const { transformPattern } = args;
    const splitFileList = await listFiles().then((fileList) =>
      extractBaseAndExt(fileList)
    );
    let listWithStats!: FileListWithStatsArray;

    if (transformPattern === "dateRename") {
      listWithStats = await provideFileStats(splitFileList);
    }

    const fileList: ExtractBaseAndExtReturn | FileListWithStatsArray =
      listWithStats ? listWithStats : splitFileList;

    const transformedNames = generateRenameList({
      ...args,
      splitFileList: fileList,
    });
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
  const { transformPattern, splitFileList } = args;
  const isEvenOddTransform = ["even", "odd"].some((pattern) =>
    transformPattern.includes(pattern)
  );
  if (isEvenOddTransform) {
    return evenOddTransform(args);
  }
  if (transformPattern === "dateRename") {
    return dateTransform(args);
  }
  console.log("No transform function available for the chosen option!");
  process.exit(0);
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

export const dryRunTransform = async (args: RenameListArgs): Promise<void> => {
  try {
    const splitFileList = await listFiles().then((fileList) =>
      extractBaseAndExt(fileList)
    );
    let listWithStats!: FileListWithStatsArray;

    if (args.transformPattern === "dateRename") {
      listWithStats = await provideFileStats(splitFileList);
    }

    const fileList: ExtractBaseAndExtReturn | FileListWithStatsArray =
      listWithStats ? listWithStats : splitFileList;
    console.log("ARGS:", args);
    const transformedNames = generateRenameList({
      ...args,
      splitFileList: fileList,
    });
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
