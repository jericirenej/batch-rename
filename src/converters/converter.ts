import { writeFile } from "fs/promises";
import { resolve } from "path";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  DryRunTransform,
  ExtractBaseAndExtReturn,
  FileListWithStatsArray,
  GenerateRenameList,
  GenerateRenameListArgs,
  RenameListArgs
} from "../types";
import { addTextTransform } from "./addTextTransform.js";
import { dateTransform, provideFileStats } from "./dateTransform.js";
import { numericTransform } from "./numericTransform.js";
import { searchAndReplace } from "./searchAndReplace.js";
import { truncateTransform } from "./truncateTransform.js";
import {
  areNewNamesDistinct,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt,
  listFiles
} from "./utils.js";
const { DUPLICATE_FILE_NAMES } = ERRORS;

export const convertFiles = async (args: RenameListArgs): Promise<void> => {
  const { transformPattern, transformPath, exclude } = args;
  const targetDir = determineDir(transformPath);
  const splitFileList = await listFiles(targetDir, exclude).then((fileList) =>
    extractBaseAndExt(fileList, targetDir)
  );
  let listWithStats!: FileListWithStatsArray;

  if (transformPattern.includes("dateRename")) {
    listWithStats = await provideFileStats(splitFileList);
  }

  const fileList: ExtractBaseAndExtReturn | FileListWithStatsArray =
    listWithStats ? listWithStats : splitFileList;

  const transformArgs: GenerateRenameListArgs = {
    ...args,
    splitFileList: fileList,
    transformPath: targetDir,
  };
  const transformedNames = generateRenameList(transformArgs);

  if (args.dryRun)
    return await dryRunTransform({
      transformPath: targetDir,
      transformedNames,
      transformPattern,
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
  if (transformPattern.length === 1) {
    const pattern = transformPattern[0];
    if (pattern === "truncate") {
      return truncateTransform(args);
    }
    if (pattern === "addText") {
      return addTextTransform(args);
    }
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
  throw new Error(ERRORS.TRANSFORM_NO_FUNCTION_AVAILABLE);
};

export const dryRunTransform: DryRunTransform = ({
  transformPath,
  transformPattern,
  transformedNames,
}): void => {
  console.log(
    "Transformation of type",
    transformPattern,
    "in folder",
    transformPath,
    "would result in:"
  );
  const noChange = transformedNames
    .filter((renameInfo) => renameInfo.original === renameInfo.rename)
    .map((renameInfo) => renameInfo.original);
  const changedNames = transformedNames.filter(
    (name) => !noChange.includes(name.original)
  );


  changedNames.forEach((name) =>
    console.log(`${name.original} --> ${name.rename}`)
  );
  if (noChange.length) {
    console.log(`Number of unchanged files: ${noChange.length}.`);
  }
  const areNamesDistinct = areNewNamesDistinct(transformedNames);
  if (!areNamesDistinct) {
    console.log(
      "\n\nWARNING: Running the transform on these files with the given parameters would result in duplicated names and throw an error!"
    );
  }
};
