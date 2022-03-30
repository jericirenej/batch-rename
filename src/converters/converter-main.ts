import type {
  GenerateRenameList,
  RenameListArgs,
  FileListWithStatsArray,
  ExtractBaseAndExtReturn,
} from "../types";
import { rename, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import { numericTransform } from "./numericTransform.js";
import { dateTransform, provideFileStats } from "./dateConverter.js";
import {
  areNewNamesDistinct,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt,
  listFiles,
} from "./utils.js";
import { searchAndReplace } from "./searchAndReplace.js";
import { ERRORS } from "../messages/errMessages.js";
const { DUPLICATE_FILE_NAMES } = ERRORS;

export const convertFiles = async (args: RenameListArgs): Promise<void> => {
  if (args.dryRun) return await dryRunTransform(args);

  const { transformPattern, transformPath } = args;
  const targetDir = determineDir(transformPath);
  const splitFileList = await listFiles(targetDir).then((fileList) =>
    extractBaseAndExt(fileList, targetDir)
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

  const newNamesDistinct = areNewNamesDistinct(transformedNames);
  if (!newNamesDistinct) throw new Error(DUPLICATE_FILE_NAMES);

  process.stdout.write("Writing rollback file...");
  await writeFile(
    resolve(targetDir, ROLLBACK_FILE_NAME),
    JSON.stringify(transformedNames, undefined, 2),
    "utf-8"
  );
  process.stdout.write("DONE.\n");
  const batchRename = createBatchRenameList(transformedNames);
  console.log(`Renaming ${batchRename.length} files...`);
  await Promise.all(batchRename);
  console.log("Completed!");
};

/**General renaming function that will call relevant transformer. Currently, it will just call the evenOddTransform, but it could also support other transform types or custom transform functions */
export const generateRenameList: GenerateRenameList = (args) => {
  const { transformPattern } = args;
  console.log(transformPattern);
  if (transformPattern === "numericTransform") {
    return numericTransform(args);
  }
  if (transformPattern === "dateRename") {
    return dateTransform(args);
  }
  if (transformPattern === "searchAndReplace") {
    return searchAndReplace(args);
  }
  console.log("No transform function available for the chosen option!");
  process.exit(0);
};

export const dryRunTransform = async (args: RenameListArgs): Promise<void> => {
  const targetDir = determineDir(args.transformPath);
  const splitFileList = await listFiles(targetDir).then((fileList) =>
    extractBaseAndExt(fileList, targetDir)
  );
  let listWithStats!: FileListWithStatsArray;

  if (args.transformPattern === "dateRename") {
    listWithStats = await provideFileStats(splitFileList);
  }

  const fileList: ExtractBaseAndExtReturn | FileListWithStatsArray =
    listWithStats ? listWithStats : splitFileList;
  const transformedNames = generateRenameList({
    ...args,
    splitFileList: fileList,
  });
  console.log(
    "Transformation of type",
    args.transformPattern,
    "in folder",
    targetDir,
    "would result in:"
  );
  transformedNames.forEach((name) =>
    console.log(`${name.original} --> ${name.rename}`)
  );
};
