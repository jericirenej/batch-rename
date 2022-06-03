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
import { formatTextTransform } from "./formatTextTransform.js";
import { numericTransform } from "./numericTransform.js";
import { searchAndReplace } from "./searchAndReplace.js";
import { truncateTransform } from "./truncateTransform.js";
import {
  areNewNamesDistinct,
  askQuestion,
  createBatchRenameList,
  determineDir,
  extractBaseAndExt,
  listFiles,
  numberOfDuplicatedNames
} from "./utils.js";
const { duplicateRenames, noTransformFunctionAvailable } = ERRORS.transforms;
const {
  exitWithoutTransform,
  questionPerformTransform,
  introText,
  warningUnaffectedFiles,
  warningDuplication,
  exitVoidTransform,
} = STATUS.dryRun;

export const TRANSFORM_CORRESPONDENCE_TABLE: Record<
  typeof VALID_TRANSFORM_TYPES[number],
  Function
> = {
  addText: (args: GenerateRenameListArgs) => addTextTransform(args),
  dateRename: (args: GenerateRenameListArgs) => dateTransform(args),
  numericTransform: (args: GenerateRenameListArgs) => numericTransform(args),
  searchAndReplace: (args: GenerateRenameListArgs) => searchAndReplace(args),
  truncate: (args: GenerateRenameListArgs) => truncateTransform(args),
  extensionModify: (args: GenerateRenameListArgs) =>
    extensionModifyTransform(args),
  format: (args: GenerateRenameListArgs) => formatTextTransform(args),
};

export const convertFiles = async (args: RenameListArgs): Promise<void> => {
  const { transformPattern, transformPath, exclude, format, includeDir } = args;
  const targetDir = determineDir(transformPath);
  const splitFileList = await listFiles(targetDir, exclude, includeDir).then(
    (fileList) => extractBaseAndExt(fileList, targetDir)
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
  if (args.dryRun) {
    const dryRun = await dryRunTransform({
      transformPath: targetDir,
      transformedNames,
      transformPattern,
    });
    if (!dryRun) {
      return;
    }
  }

  const newNamesDistinct = areNewNamesDistinct(transformedNames);
  if (!newNamesDistinct) throw new Error(duplicateRenames);

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
  throw new Error(noTransformFunctionAvailable);
};

export const dryRunTransform: DryRunTransform = async ({
  transformPath,
  transformPattern,
  transformedNames,
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

  console.log(introText(transformPattern, transformPath));
  console.table(changedNames, ["original", "rename"]);

  if (unaffectedFiles > 0) {
    console.log(warningUnaffectedFiles(unaffectedFiles));
  }
  if (targetDuplication > 0) {
    console.log(warningDuplication(targetDuplication));
    return false;
  }

  const response = await askQuestion(questionPerformTransform);
  if (VALID_DRY_RUN_ANSWERS.includes(response.toLocaleLowerCase())) {
    return true;
  }
  console.log(exitWithoutTransform);
  return false;
};
