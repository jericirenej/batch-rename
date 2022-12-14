import { writeFile } from "fs/promises";
import { resolve } from "path";
import {
  ROLLBACK_FILE_NAME,
  VALID_DRY_RUN_ANSWERS,
  VALID_TRANSFORM_TYPES
} from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { STATUS } from "../messages/statusMessages.js";
import type {
  BaseRenameItem,
  DryRunTransform,
  FileListWithStatsArray,
  GenerateRenameList,
  GenerateRenameListArgs,
  RenameListArgs,
  SplitFileList
} from "../types";
import { createRollback } from "../utils/rollbackUtils.js";
import {
  areNewNamesDistinct,
  areTransformsDistinct,
  askQuestion,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt,
  filterOutDuplicatedTransforms,
  listFiles,
  numberOfDuplicatedNames,
  settledPromisesEval,
  willOverWriteExisting
} from "../utils/utils.js";
import { addTextTransform } from "./addTextTransform.js";
import { dateTransform, provideFileStats } from "./dateTransform.js";
import { extensionModifyTransform } from "./extensionModify.js";
import { formatTextTransform } from "./formatTextTransform.js";
import { keepTransform } from "./keepTransform.js";
import { numericTransform } from "./numericTransform.js";
import { searchAndReplace } from "./searchAndReplace.js";
import { truncateTransform } from "./truncateTransform.js";
const {
  duplicateRenames,
  noTransformFunctionAvailable,
  duplicateSourceAndOrigin,
  noFilesToTransform,
} = ERRORS.transforms;
const {
  exitWithoutTransform,
  questionPerformTransform,
  transformIntro,
  warningUnaffectedFiles,
  warningDuplication,
  warningOverwrite,
  exitVoidTransform,
} = STATUS.dryRun;

export const TRANSFORM_CORRESPONDENCE_TABLE: Record<
  typeof VALID_TRANSFORM_TYPES[number],
  (args: GenerateRenameListArgs) => BaseRenameItem[]
> = {
  addText: (args: GenerateRenameListArgs) => addTextTransform(args),
  dateRename: (args: GenerateRenameListArgs) => dateTransform(args),
  numericTransform: (args: GenerateRenameListArgs) => numericTransform(args),
  searchAndReplace: (args: GenerateRenameListArgs) => searchAndReplace(args),
  keep: (args: GenerateRenameListArgs) => keepTransform(args),
  truncate: (args: GenerateRenameListArgs) => truncateTransform(args),
  extensionModify: (args: GenerateRenameListArgs) =>
    extensionModifyTransform(args),
  format: (args: GenerateRenameListArgs) => formatTextTransform(args),
};

export const convertFiles = async (args: RenameListArgs): Promise<void> => {
  const { transformPattern, transformPath, exclude, targetType } = args;
  const targetDir = determineDir(transformPath);
  const splitFileList = await listFiles(targetDir, exclude, targetType).then(
    (fileList) => extractBaseAndExt(fileList, targetDir)
  );
  let listWithStats!: FileListWithStatsArray;

  if (transformPattern.includes("dateRename")) {
    listWithStats = await provideFileStats(splitFileList);
  }

  const fileList: SplitFileList = listWithStats ? listWithStats : splitFileList;

  const transformArgs: GenerateRenameListArgs = {
    ...args,
    splitFileList: fileList,
    transformPath: targetDir,
  };
  let transformedNames = generateRenameList(transformArgs);
  if (args.dryRun) {
    const dryRun = await dryRunTransform({
      transformPath: targetDir,
      transformedNames,
      transformPattern,
      fileList,
    });
    if (!dryRun) {
      return;
    }
  }
  const noDistinctTransforms = areTransformsDistinct(transformedNames);

  // Precaution in case any of the converters returns
  // identical names and renames
  if (!noDistinctTransforms) {
    transformedNames = filterOutDuplicatedTransforms(transformedNames);
  }

  if (!transformedNames.length) throw new Error(noFilesToTransform);
  const newNamesDistinct = areNewNamesDistinct(transformedNames);
  if (!noDistinctTransforms) throw new Error(duplicateSourceAndOrigin);
  if (!newNamesDistinct) throw new Error(duplicateRenames);

  const transforms = { transforms: transformedNames, sourcePath: targetDir };

  const batchRename = createBatchRenameList(transforms);
  console.log(`Renaming ${batchRename.length} files...`);
  const promiseResults = await Promise.allSettled(batchRename);
  const updatedBaseRenameList = settledPromisesEval({
    promiseResults,
    transformedNames: transforms.transforms,
    operationType: "convert",
  }).successful;

  console.log("Rename completed!");
  
  if (args.skipRollback) return;
  const createdRollback = await createRollback({
    transforms: updatedBaseRenameList,
    sourcePath: targetDir,
  });
  process.stdout.write("Writing rollback file...");
  await writeFile(
    resolve(targetDir, ROLLBACK_FILE_NAME),
    JSON.stringify(createdRollback, undefined, 2),
    "utf-8"
  );
  process.stdout.write("DONE.\n");
};

export const generateRenameList: GenerateRenameList = (args) => {
  const { transformPattern } = args;
  const primaryTransform = transformPattern[0];
  if (Object.keys(TRANSFORM_CORRESPONDENCE_TABLE).includes(primaryTransform)) {
    return TRANSFORM_CORRESPONDENCE_TABLE[primaryTransform](args);
  }
  throw new Error(noTransformFunctionAvailable);
};

export const dryRunTransform: DryRunTransform = async ({
  transformPath,
  transformPattern,
  transformedNames,
  fileList,
}) => {
  const changedNames = transformedNames.filter(
    (renameInfo) => renameInfo.original !== renameInfo.rename
  );
  if (changedNames.length === 0) {
    console.log(exitVoidTransform);
    return false;
  }

  const transformData: Record<string, number> = {};
  (["transforms", "results"] as const).forEach((checkType) => {
    transformData[checkType] = numberOfDuplicatedNames({
      renameList: transformedNames,
      checkType,
    });
  });
  const { transforms: unaffectedFiles, results: targetDuplication } =
    transformData;
  const willOverwrite = willOverWriteExisting(transformedNames, fileList);

  console.log(transformIntro(transformPattern, transformPath));
  console.table(changedNames, ["original", "rename"]);

  if (unaffectedFiles > 0) {
    console.log(warningUnaffectedFiles(unaffectedFiles));
  }
  if (targetDuplication > 0) {
    console.log(warningDuplication(targetDuplication));
    return false;
  }

  if (willOverwrite) {
    console.log(warningOverwrite);
    return false;
  }

  const response = await askQuestion(questionPerformTransform);
  if (VALID_DRY_RUN_ANSWERS.includes(response.toLocaleLowerCase())) {
    return true;
  }
  console.log(exitWithoutTransform);
  return false;
};
