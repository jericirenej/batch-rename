import { existsSync } from "fs";
import { lstat, readdir, rename, unlink } from "fs/promises";
import { join, resolve } from "path";
import readline from "readline";
import {
  DEFAULT_SEPARATOR,
  DEFAULT_TARGET_TYPE,
  EXT_REGEX,
  ROLLBACK_FILE_NAME
} from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { STATUS } from "../messages/statusMessages.js";
import type {
  AreNewNamesDistinct,
  BuildRestoreFile,
  CheckPath,
  CleanUpRollbackFile,
  ComposeRenameString,
  CreateBatchRenameList,
  DetermineDir,
  DetermineRollbackLevel,
  ExtractBaseAndExt,
  FilesWithMissingRestores,
  ListFiles, NumberOfDuplicatedNames,
  RenameList,
  RestoreFileMapper,
  RestoreList,
  TruncateFileName
} from "../types.js";
import { formatFile } from "./formatTextTransform.js";

const {
  allRenameFailed,
  pathDoesNotExist,
  pathIsNotDir,
  noChildFiles,
  noChildDirs,
  noChildEntries,
} = ERRORS.utils;
const { truncateInvalidArgument } = ERRORS.transforms;
const { noRollbackFile } = ERRORS.cleanRollback;
const { failReport, failItem } = STATUS.settledPromisesEval;
const { zeroLevelRollback } = ERRORS.restoreFileMapper;
const { rollbackLevelOverMax, rollbackLevelsLessThanTarget } =
  STATUS.restoreFileMapper;

export const cleanUpRollbackFile: CleanUpRollbackFile = async ({
  transformPath,
}) => {
  const targetDir = determineDir(transformPath);
  const targetPath = resolve(targetDir, ROLLBACK_FILE_NAME);
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    throw new Error(noRollbackFile);
  }
  process.stdout.write("Deleting rollback file...");
  await unlink(targetPath);
  process.stdout.write("DONE!");
};

/**Will separate the basename and file extension, in addition to providing
 * a sourcePath and type information. If no extension is found, it will return
 * the whole file name  under the base property and an empty ext string. */
export const extractBaseAndExt: ExtractBaseAndExt = (fileList, sourcePath) => {
  const regex = EXT_REGEX;
  return fileList.map((file) => {
    const isDir = file.isDirectory(),
      type = isDir ? "directory" : "file",
      fileName = file.name;
    const extPosition = isDir ? -1 : fileName.search(regex);
    if (extPosition !== -1) {
      return {
        baseName: fileName.slice(0, extPosition),
        ext: fileName.slice(extPosition),
        sourcePath,
        type,
      };
    }
    return { baseName: fileName, ext: "", sourcePath, type };
  });
};

/** Will return a Dirent list of entities.
 * Can exclude files based on matches supplied with **excludeFilter**.
 * If a **targetType** argument is supplied, it will only return entries of
 * a specified type (defaults to files). */
export const listFiles: ListFiles = async (
  transformPath,
  excludeFilter,
  targetType = DEFAULT_TARGET_TYPE
) => {
  const targetDir = determineDir(transformPath);
  const dirContent = await readdir(targetDir, { withFileTypes: true });
  let files = dirContent
    .filter((dirEntry) => dirEntry.name !== ROLLBACK_FILE_NAME)
    .filter((dirEntry) => {
      if (targetType === "all") return dirEntry;
      if (targetType === "files") return dirEntry.isFile();
      return dirEntry.isDirectory();
    });
  if (excludeFilter) {
    const regex = new RegExp(excludeFilter);
    files = files.filter((fileName) => !regex.test(fileName.name));
  }
  return files;
};

/** Calls *numberOfDuplicatedNames* with the "results" checkType
 * and then evaluates if the result is less or equal than 0.
 */
export const areNewNamesDistinct: AreNewNamesDistinct = (renameList) => {
  const duplicates = numberOfDuplicatedNames({
    renameList,
    checkType: "results",
  });
  return duplicates <= 0;
};

/** Check for duplicated fileNames which would lead to errors. Takes in an
 * @param args.renameList - Supply rename list of appropriate type.
    @param {"results"|"transforms"} args.checkType - If *'results'* are specified,functions checks if there are duplicated among the target transformed names. 
    If *'transforms'* are specified, it checks whether there exist identical transformation (original === rename).
 */

export const numberOfDuplicatedNames: NumberOfDuplicatedNames = ({
  renameList,
  checkType,
}) => {
  if (checkType === "results") {
    const renames = renameList.map((renameInfo) => renameInfo.rename);
    let newNamesUniqueLength = new Set(renames).size;
    return renames.length - newNamesUniqueLength;
  }
  if (checkType === "transforms") {
    const duplicatedTransforms = renameList.filter(
      (renameInfo) => renameInfo.original === renameInfo.rename
    );
    return duplicatedTransforms.length;
  }
  return -1;
};

export const checkPath: CheckPath = async (
  path,
  targetType = DEFAULT_TARGET_TYPE
) => {
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) {
    throw new Error(pathDoesNotExist);
  }
  const isDir = (await lstat(fullPath)).isDirectory();
  if (!isDir) {
    throw new Error(pathIsNotDir);
  }
  const dirInfo = await readdir(fullPath, { withFileTypes: true });
  if (!dirInfo.length) {
    throw new Error(noChildEntries);
  }
  if (targetType === "all") return fullPath;

  if (targetType === "files") {
    const hasFiles =
      dirInfo.filter((childNode) => childNode.isFile()).length > 0;
    if (!hasFiles) {
      throw new Error(noChildFiles);
    }
  }

  if (targetType === "dirs") {
    const hasDirs =
      dirInfo.filter((childNode) => childNode.isDirectory()).length > 0;
    if (!hasDirs) {
      throw new Error(noChildDirs);
    }
  }
  return fullPath;
};

export const determineDir: DetermineDir = (transformPath) =>
  transformPath ? transformPath : process.cwd();

export const composeRenameString: ComposeRenameString = ({
  baseName: _baseName,
  ext,
  addText,
  textPosition,
  separator,
  preserveOriginal,
  newName,
  truncate,
  format,
  noExtensionPreserve,
}) => {
  const position = textPosition ? textPosition : "append";
  const extension = ext ? ext : "";
  let sep = "";
  // Allow for empty separator (direct concatenation)
  // For undefined cases, force default separator, unless newName is falsy.
  if (separator) sep = separator;
  if (separator === undefined && newName) sep = DEFAULT_SEPARATOR;

  let modifiedName = newName;

  // Truncate baseName OR add custom text.
  const shouldTruncate = !isNaN(Number(truncate)) && preserveOriginal;
  let baseName = _baseName;
  if (shouldTruncate)
    baseName = truncateFile({
      baseName,
      preserveOriginal,
      truncate: truncate!,
    });
  // Custom text overrides preserveOriginal setting.
  const customOrOriginalText = addText
    ? addText
    : preserveOriginal
    ? baseName
    : "";
  if (customOrOriginalText) {
    if (position === "append") {
      modifiedName = `${newName}${sep}${customOrOriginalText}`;
    }
    if (position === "prepend") {
      modifiedName = `${customOrOriginalText}${sep}${newName}`;
    }
  }
  // Format final rename text, if argument supplied.
  if (format) {
    if (noExtensionPreserve) {
      return formatFile(`${modifiedName}${extension}`, format);
    }
    modifiedName = formatFile(modifiedName, format);
  }
  return `${modifiedName}${extension}`;
};

/**A factory function which creates an async array of renaming operations
 * for either a transform or a revert operation. Restore operations are triggered
 * if a filesToRevert argument is supplied.
 */
export const createBatchRenameList: CreateBatchRenameList = (
  renameList,
  filesToRevert = []
) => {
  const batchRename: Promise<void>[] = [];
  if (filesToRevert.length) {
    filesToRevert.forEach((file) => {
      const targetName = renameList.find((fileInfo) => {
        const { rename, original } = fileInfo;
        return rename === file && original !== rename;
      });
      if (targetName) {
        const [currentPath, revertPath] = [
          join(targetName.sourcePath, file),
          join(targetName.sourcePath, targetName.original),
        ];
        return batchRename.push(rename(currentPath, revertPath));
      }
    });
    return batchRename;
  }
  renameList.forEach((fileInfo) => {
    const { original, rename: newName, sourcePath } = fileInfo;
    if (original !== newName) {
      const [originalFullPath, newNameFullPath] = [
        join(sourcePath, original),
        join(sourcePath, newName),
      ];
      batchRename.push(rename(originalFullPath, newNameFullPath));
    }
  });
  return batchRename;
};

/**Remove entries from the list for which the renaming operation
 * resulted in a rejected promise. */
export const settledPromisesEval = ({
  transformedNames,
  promiseResults,
  operationType,
}: {
  transformedNames: RenameList;
  promiseResults: PromiseSettledResult<void>[];
  operationType: "convert" | "restore";
}): RenameList => {
  const promisesRejected = promiseResults.filter(
    (settledResult) => settledResult.status === "rejected"
  ).length;

  if (promisesRejected === 0) return transformedNames;
  if (promisesRejected === transformedNames.length)
    throw new Error(allRenameFailed);

  console.log(failReport(promisesRejected, operationType));
  const truncatedList: RenameList = [];
  promiseResults.forEach((settledResult, index) => {
    if (settledResult.status === "rejected") {
      const { original, rename } = transformedNames[index];
      console.log(failItem(original, rename, operationType));
      return;
    }
    return truncatedList.push(transformedNames[index]);
  });
  return truncatedList;
};

/** Will truncate baseName to the length of the supplied truncate argument
 * If preserveOriginal is false or truncate evaluates to 0,
 * it will return the baseName.
 */
export const truncateFile: TruncateFileName = ({
  preserveOriginal,
  baseName,
  truncate,
}) => {
  if (!preserveOriginal) {
    return baseName;
  }
  const limit = Number(truncate);
  if (isNaN(limit)) throw new Error(truncateInvalidArgument);
  if (limit === 0) return baseName;

  return baseName.slice(0, limit);
};

export const askQuestion = (question: string): Promise<string> => {
  const rl = readline.createInterface(process.stdin, process.stdout);
  return new Promise((resolve) => {
    rl.question(question + "\n", (answer) => resolve(answer));
  });
};

export const determineRollbackLevel: DetermineRollbackLevel = ({
  rollbackList,
  rollbackLevel = 1,
}) => {
  if (rollbackLevel === 0) throw new Error(zeroLevelRollback);
  let targetRestoreLevel = rollbackLevel;
  const maximumRestoreLevel = rollbackList.length;
  if (rollbackLevel > maximumRestoreLevel) {
    console.log(rollbackLevelOverMax);
    targetRestoreLevel = maximumRestoreLevel;
  }
  return targetRestoreLevel;
};

/**Evaluate the restore list. For elements that have fewer restores than
 * the target level, log this to the console. Return a single transform from
 * the latest file to the target (or earliest available) original name */
export const buildRestoreFile: BuildRestoreFile = ({
  restoreList,
  targetLevel,
  sourcePath,
}) => {
  const filesWithMissingRestores = [] as FilesWithMissingRestores[];
  const entries = Object.entries(restoreList);
  const transformRestore: RestoreList = { sourcePath, transforms: [] };
  entries.forEach(([referenceId, transformList]) => {
    const [rename, original] = [
      transformList[0],
      transformList[transformList.length - 1],
    ];
    // Transform list should be equal to number of rollbacks + current name
    if (transformList.length < targetLevel + 1) {
      filesWithMissingRestores.push({
        file: join(sourcePath, rename).replaceAll("\\", "/"),
        found: transformList.length - 1,
        requested: targetLevel,
      });
    }
    return transformRestore.transforms.push({ rename, original, referenceId });
  });
  // Notify if some transforms restore levels are less than requested
  if (filesWithMissingRestores.length) {
    console.log(
      rollbackLevelsLessThanTarget(
        filesWithMissingRestores.length,
        entries.length
      )
    );
    console.table(filesWithMissingRestores);
  }
  return transformRestore;
};

export const restoreFileMapper: RestoreFileMapper = ({
  rollbackFile,
  rollbackLevel = 1,
}): any => {
  const { transforms, sourcePath } = rollbackFile;
  const targetLevel = determineRollbackLevel({
    rollbackList: transforms,
    rollbackLevel,
  }),
    lookupSlice = transforms.slice(1, targetLevel);
  const restoreList = {} as Record<string, string[]>;
  transforms[0].forEach(
    ({ referenceId, rename, original }) =>
      (restoreList[referenceId] = [rename, original])
  );
  const referenceList = Object.keys(restoreList);

  console.log(restoreList, sourcePath);

  lookupSlice.forEach((transformSlice) => {
    transformSlice.forEach(({ referenceId, original }) => {
      if (referenceList.includes(referenceId)) {
        restoreList[referenceId].push(original);
      }
    });
  });
  console.log(buildRestoreFile({restoreList, targetLevel, sourcePath}));
  return buildRestoreFile({restoreList, targetLevel, sourcePath});
};
