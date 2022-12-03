import { existsSync } from "fs";
import {
  lstat,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile
} from "fs/promises";
import { join, parse, resolve } from "path";
import readline from "readline";
import {
  DEFAULT_SEPARATOR,
  DEFAULT_TARGET_TYPE,
  EXT_REGEX,
  ROLLBACK_FILE_NAME
} from "../constants.js";
import { formatFile } from "../converters/formatTextTransform.js";
import { ERRORS } from "../messages/errMessages.js";
import { STATUS } from "../messages/statusMessages.js";
import type {
  AreNewNamesDistinct,
  AreTransformsDistinct,
  BaseRenameItem,
  BaseRenameList,
  CheckPath,
  ComposeRenameString,
  CreateBatchRenameList,
  DetermineDir,
  ExtractBaseAndExt,
  ListFiles,
  NumberOfDuplicatedNames,
  PromiseRejectedWriteResult,
  RenameItem,
  RenameItemsArray,
  RollbackFile,
  TrimRollbackFile,
  TruncateFileName
} from "../types.js";
import { checkRestoreFile } from "./restoreUtils.js";

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

export const jsonParseReplicate = <T>(arg: string): T => JSON.parse(arg) as T;
export const jsonReplicate = <T>(arg: T): T =>
  jsonParseReplicate(JSON.stringify(arg)) as T;
export const sortedJsonReplicate = <T extends unknown[]>(arg: T): T =>
  jsonReplicate(arg).sort();

export const parseBoolOption = (arg?: unknown, defaultVal = false): boolean => {
  try {
    if (!arg) return defaultVal;
    const parsed = JSON.parse(String(arg).toLowerCase());
    return typeof parsed === "boolean" ? parsed : defaultVal;
  } catch {
    return defaultVal;
  }
};

export const parseRestoreArg = (arg: unknown): number => {
  try {
    if (typeof arg === "boolean") {
      return 0;
    } else {
      const num = Number(arg);
      return Number.isNaN(num) ? 0 : Math.abs(Math.floor(num));
    }
  } catch {
    return 0;
  }
};

export const extractCurrentReferences = (
  rollbackTransforms: RenameItemsArray[],
  currentNames: string[]
): { withIds: Record<string, string>; noIds: string[] } => {
  const alreadyCheckedRefs: string[] = [];
  let namesLeftToCheck = [...currentNames];
  const namesAndReferences: Record<string, string> = {};
  for (const rollback of rollbackTransforms) {
    if (!namesLeftToCheck.length) break;

    // Names to filter out in the next round;
    const namesToExclude: string[] = [];
    let eligible = rollback;
    if (alreadyCheckedRefs.length) {
      eligible = eligible.filter(
        ({ referenceId }) => !alreadyCheckedRefs.includes(referenceId)
      );
    }
    if (!eligible.length) continue;

    namesLeftToCheck.forEach((name) => {
      const found = eligible.find(({ rename }) => name === rename);
      if (found) {
        namesAndReferences[name] = found.referenceId;
        namesToExclude.push(name);
      }
    });

    namesLeftToCheck = namesLeftToCheck.filter(
      (name) => !namesToExclude.includes(name)
    );
  }
  return { withIds: namesAndReferences, noIds: namesLeftToCheck };
};

export const trimRollbackFile: TrimRollbackFile = async ({
  sourcePath,
  targetLevel,
  failed,
}) => {
  const targetDir = determineDir(sourcePath);
  const targetPath = resolve(targetDir, ROLLBACK_FILE_NAME);
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    throw new Error(noRollbackFile);
  }
  const rollbackFile = JSON.parse(await readFile(targetPath, "utf-8"));

  const verifiedRollback = checkRestoreFile(rollbackFile);
  const remainingTransforms = verifiedRollback.transforms.slice(targetLevel);

  const shouldDelete = [remainingTransforms, failed].every(
    (arr) => !arr.length
  );

  if (shouldDelete) {
    process.stdout.write("Deleting rollback file...");
    await unlink(targetPath);
    process.stdout.write("DONE!");
    return;
  }

  let mappedFailed: RenameItemsArray = [];
  if (failed.length) {
    const mappedEntry = new Map() as Map<string, RenameItem>;

    remainingTransforms[0]?.reduce(
      (map, curr) => map.set(curr.referenceId, curr),
      mappedEntry
    );

    !mappedEntry.size ? mappedFailed = [...failed] :
      failed.forEach(({ rename, original, referenceId }) => {
        const ref = mappedEntry.get(referenceId);
        if (!ref) return mappedFailed.push({ rename, original, referenceId });

        const isDistinct = original !== ref.rename;
          mappedFailed.push({
            rename,
            original: isDistinct ? ref.rename : original,
            referenceId,
          });
      });
    
    console.log(
      "Failed restore items will be appended to most recent rollback entry."
    );
  }

  const newRollbackFile: RollbackFile = {
    sourcePath,
    transforms: [[...mappedFailed], ...remainingTransforms].filter(
      (entry) => entry.length
    ),
  };

  process.stdout.write("Updating rollback file...");
  await writeFile(
    resolve(targetDir, ROLLBACK_FILE_NAME),
    JSON.stringify(newRollbackFile, undefined, 2),
    "utf-8"
  );

  process.stdout.write("DONE!");
};

export const deleteRollbackFile = async (
  transformPath?: string
): Promise<void> => {
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
    // Global flag should not be used, as inconsistent results will occur
    const regex = new RegExp(excludeFilter, "u");
    files = files.filter(({ name }) => !regex.test(name));
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

export const areTransformsDistinct: AreTransformsDistinct = (renameList) => {
  const duplicates = numberOfDuplicatedNames({
    renameList,
    checkType: "transforms",
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
    const renames = renameList.map(({ rename }) => rename);
    const newNamesUniqueLength = new Set(renames).size;
    return renames.length - newNamesUniqueLength;
  }
  if (checkType === "transforms") {
    const duplicatedTransforms = renameList.filter(
      ({ original, rename }) => original === rename
    );
    return duplicatedTransforms.length;
  }
  return -1;
};

export const filterOutDuplicatedTransforms = (
  renameList: BaseRenameList
): BaseRenameList =>
  renameList.filter(({ original, rename }) => original !== rename);

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
export const createBatchRenameList: CreateBatchRenameList = ({
  transforms,
  sourcePath,
  filesToRestore = [],
}) => {
  const batchRename: Promise<void>[] = [];
  if (filesToRestore.length) {
    filesToRestore.forEach((file) => {
      const targetName = transforms.find((fileInfo) => {
        const { rename, original } = fileInfo;
        return rename === file && original !== rename;
      });
      if (targetName) {
        const [currentPath, revertPath] = [
          join(sourcePath, file),
          join(sourcePath, targetName.original),
        ];
        return batchRename.push(rename(currentPath, revertPath));
      }
    });
    return batchRename;
  }
  transforms.forEach(({ original, rename: newName }) => {
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
export const settledPromisesEval = <
  T extends G[],
  G extends BaseRenameItem | RenameItem
>({
  transformedNames,
  promiseResults,
  operationType,
}: {
  transformedNames: T;
  promiseResults: (PromiseFulfilledResult<void> | PromiseRejectedWriteResult)[];
  operationType: "convert" | "restore";
}): { successful: T; failed: T } => {
  const failed = [] as unknown as T;
  const promisesRejected = promiseResults.filter(
    (settledResult) => settledResult.status === "rejected"
  ).length;

  if (promisesRejected === 0) return { successful: transformedNames, failed };
  if (promisesRejected === transformedNames.length)
    throw new Error(allRenameFailed);

  console.log(failReport(promisesRejected, operationType));

  const transformMap = transformedNames.reduce(
    (map, curr) => map.set(curr.rename, { ...curr }),
    new Map() as Map<string, G>
  );

  promiseResults.forEach((settledResult) => {
    if (settledResult.status === "rejected") {
      const { path, dest } = settledResult.reason;
      const origin = parse(path).base,
        destination = parse(dest).base;
      console.log(failItem(origin, destination, operationType));
      const targetProp = operationType === "convert" ? destination : origin;
      failed.push(transformMap.get(targetProp)!);
      transformMap.delete(targetProp);
    }
  });
  return { successful: [...transformMap.values()] as T, failed };
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
