import { rename, writeFile } from "fs/promises";
import { resolve } from "path";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import type {
  GenerateRenameList,
  RenameListArgs,
  FileListWithStatsArray,
  ExtractBaseAndExtReturn,
} from "../types";
import { evenOddTransform } from "./evenOddTransform.js";
import { dateTransform, provideFileStats } from "./dateConverter.js";
import { extractBaseAndExt, listFiles } from "./utils.js";

export const renameFiles = async (args: RenameListArgs): Promise<void> => {
  try {
    if(args.dryRun) return await dryRunTransform(args);

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
