import { writeFile } from "fs/promises";
import { resolve } from "path";
import { ROLLBACK_FILE_NAME, VALID_TRANSFORM_TYPES } from "../constants.js";
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
import { extensionModifyTransform } from "./extensionModify.js";
import { numericTransform } from "./numericTransform.js";
import { searchAndReplace } from "./searchAndReplace.js";
import { truncateTransform } from "./truncateTransform.js";
import {
  areNewNamesDistinct,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt,
  listFiles,
  numberOfDuplicatedNames
} from "./utils.js";
const { DUPLICATE_FILE_NAMES } = ERRORS;

export const TRANSFORM_CORRESPONDENCE_TABLE: Record<
  typeof VALID_TRANSFORM_TYPES[number],
  Function
> = {
  addText: (args: GenerateRenameListArgs) => addTextTransform(args),
  dateRename: (args: GenerateRenameListArgs) => dateTransform(args),
  numericTransform: (args: GenerateRenameListArgs) => numericTransform(args),
  searchAndReplace: (args: GenerateRenameListArgs) => searchAndReplace(args),
  truncate: (args: GenerateRenameListArgs) => truncateTransform(args),
  extensionModify: (args: GenerateRenameListArgs) => extensionModifyTransform(args),
};

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
    return dryRunTransform({
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

export const generateRenameList: GenerateRenameList = (args) => {
  const { transformPattern } = args;
  const primaryTransform = transformPattern[0];
  if (Object.keys(TRANSFORM_CORRESPONDENCE_TABLE).includes(primaryTransform)) {
    return TRANSFORM_CORRESPONDENCE_TABLE[primaryTransform](args);
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
  const changedNames = transformedNames.filter(
    (renameInfo) => renameInfo.original !== renameInfo.rename
  );
  const duplicatedTransforms = numberOfDuplicatedNames({
    renameList: transformedNames,
    checkType: "transforms",
  });
  const duplicatedRenames = numberOfDuplicatedNames({
    renameList: transformedNames,
    checkType: "results",
  });

  changedNames.forEach((name) =>
    console.log(`${name.original} --> ${name.rename}`)
  );
  if (duplicatedTransforms > 0) {
    console.log(`Number of unaffected files: ${duplicatedTransforms}.`);
  }
  if (duplicatedRenames > 0) {
    console.log(`
    
    WARNING: Running the transform on these files with the given parameters would result in ${duplicatedRenames} duplicated names and throw an error!`);
  }
};
