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
import { dateTransform, provideFileStats } from "./dateTransform.js";
import {
  areNewNamesDistinct,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt,
  listFiles,
} from "./utils.js";
import { searchAndReplace } from "./searchAndReplace.js";
import { ERRORS } from "../messages/errMessages.js";
import { truncateTransform } from "./truncateTransform.js";
const { DUPLICATE_FILE_NAMES } = ERRORS;

export const convertFiles = async (args: RenameListArgs): Promise<void> => {
  if (args.dryRun) return await dryRunTransform(args);

  const { transformPattern, transformPath } = args;
  const targetDir = determineDir(transformPath);
  const splitFileList = await listFiles(targetDir).then((fileList) =>
    extractBaseAndExt(fileList, targetDir)
  );
  let listWithStats!: FileListWithStatsArray;

  if (transformPattern.includes("dateRename")) {
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
  if (transformPattern.length === 1 && transformPattern[0] === "truncate") {
    return truncateTransform(args);
  }
  if (transformPattern.includes("numericTransform")) {
    return numericTransform(args);
  }
  if (transformPattern.includes("dateRename")) {
    return dateTransform(args);
  }
  if (transformPattern.includes("searchAndReplace")) {
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

  if (args.transformPattern.includes("dateRename")) {
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
  const areNamesDistinct = areNewNamesDistinct(transformedNames);
  if (!areNamesDistinct) {
    console.warn(
      "\n\nWARNING: Running the transform on these files with the given parameters would result in duplicated names and throw an error!"
    );
  }
};
