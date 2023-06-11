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
  SplitFileList,
  TruncateFileName
} from "batch-rename-lib";
import {
  DEFAULT_SEPARATOR,
  DEFAULT_TARGET_TYPE,
  ERRORS,
  EXT_REGEX,
  ROLLBACK_FILE_NAME,
  STATUS
} from "batch-rename-lib";
import { existsSync } from "fs";
import { lstat, readdir, rename } from "fs/promises";
import { join, parse, resolve } from "path";
import readline from "readline";
import { formatFile } from "../converters/formatTextTransform.js";

const {
  allRenameFailed,
  pathDoesNotExist,
  pathIsNotDir,
  noChildFiles,
  noChildDirs,
  noChildEntries,
} = ERRORS.utils;
const { truncateInvalidArgument } = ERRORS.transforms;

const { failReport, failItem } = STATUS;

export const jsonParseReplicate = <T>(arg: string): T => JSON.parse(arg) as T;
export const jsonReplicate = <T>(arg: T): T => jsonParseReplicate(JSON.stringify(arg)) as T;
export const sortedJsonReplicate = <T extends unknown[]>(arg: T): T => jsonReplicate(arg).sort();

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
    }
    const num = Number(arg);
    return Number.isNaN(num) ? 0 : Math.abs(Math.floor(num));
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
      eligible = eligible.filter(({ referenceId }) => !alreadyCheckedRefs.includes(referenceId));
    }
    // eslint-disable-next-line no-continue
    if (!eligible.length) continue;

    namesLeftToCheck.forEach((name) => {
      const found = eligible.find(({ rename }) => name === rename);
      if (found) {
        namesAndReferences[name] = found.referenceId;
        namesToExclude.push(name);
      }
    });

    namesLeftToCheck = namesLeftToCheck.filter((name) => !namesToExclude.includes(name));
  }
  return { withIds: namesAndReferences, noIds: namesLeftToCheck };
};

/** Will separate the basename and file extension, in addition to providing
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

export const determineDir: DetermineDir = (transformPath) => transformPath || process.cwd();

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
    })
    // Sort the file list by names alphabetically and ascending.
    .sort((a, b) => (a.name === b.name ? 0 : a.name < b.name ? -1 : 1))
    // Directories should be listed first
    .sort((a, b) => {
      const aVal = a.isDirectory() ? -1 : 1,
        bVal = b.isDirectory() ? -1 : 1;
      return aVal === bVal ? 0 : aVal < bVal ? -1 : 1;
    });
  if (excludeFilter) {
    // Global flag should not be used, as inconsistent results will occur
    const regex = new RegExp(excludeFilter, "u");
    files = files.filter(({ name }) => !regex.test(name));
  }
  return files;
};

/** Check for duplicated fileNames which would lead to errors. Takes in an
 * @param args.renameList - Supply rename list of appropriate type.
    @param {"results"|"transforms"} args.checkType - If *'results'* are specified,functions checks if there are duplicated among the target transformed names. 
    If *'transforms'* are specified, it checks whether there exist identical transformation (original === rename). */
export const numberOfDuplicatedNames: NumberOfDuplicatedNames = ({ renameList, checkType }) => {
  if (checkType === "results") {
    const renames = renameList.map(({ rename }) => rename);
    const newNamesUniqueLength = new Set(renames).size;
    return renames.length - newNamesUniqueLength;
  }
  if (checkType === "transforms") {
    const duplicatedTransforms = renameList.filter(({ original, rename }) => original === rename);
    return duplicatedTransforms.length;
  }
  return -1;
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

export const filterOutDuplicatedTransforms = (renameList: BaseRenameList): BaseRenameList =>
  renameList.filter(({ original, rename }) => original !== rename);

export const willOverWriteExisting = (
  renameList: BaseRenameList,
  fileList: SplitFileList
): boolean => {
  const originals: string[] = [],
    renames: string[] = [];
  renameList.forEach(({ original, rename }) => {
    originals.push(original);
    renames.push(rename);
  });
  const fileListWithoutTransforms = fileList
    .map(({ baseName, ext }) => `${baseName}${ext}`)
    .filter((existingName) => !originals.includes(existingName));
  if (!fileListWithoutTransforms.length) return false;
  return fileListWithoutTransforms.some((existingName) => renames.includes(existingName));
};

export const checkPath: CheckPath = async (path, targetType = DEFAULT_TARGET_TYPE) => {
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
    const hasFiles = dirInfo.filter((childNode) => childNode.isFile()).length > 0;
    if (!hasFiles) {
      throw new Error(noChildFiles);
    }
  }

  if (targetType === "dirs") {
    const hasDirs = dirInfo.filter((childNode) => childNode.isDirectory()).length > 0;
    if (!hasDirs) {
      throw new Error(noChildDirs);
    }
  }
  return fullPath;
};

/** Will truncate baseName to the length of the supplied truncate argument
 * If preserveOriginal is false or truncate evaluates to 0,
 * it will return the baseName.
 */
export const truncateFile: TruncateFileName = ({ preserveOriginal, baseName, truncate }) => {
  if (!preserveOriginal) {
    return baseName;
  }
  const limit = Number(truncate);
  if (Number.isNaN(limit)) throw new Error(truncateInvalidArgument);
  if (limit === 0) return baseName;

  return baseName.slice(0, limit);
};

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
  const position = textPosition || "append";
  const extension = ext || "";
  let sep = "";
  // Allow for empty separator (direct concatenation)
  // For undefined cases, force default separator, unless newName is falsy.
  if (separator) sep = separator;
  if (separator === undefined && newName) sep = DEFAULT_SEPARATOR;

  let modifiedName = newName;

  // Truncate baseName OR add custom text.
  const shouldTruncate = !Number.isNaN(Number(truncate)) && preserveOriginal;
  let baseName = _baseName;
  if (shouldTruncate)
    baseName = truncateFile({
      baseName,
      preserveOriginal,
      truncate: truncate!,
    });
  // Custom text overrides preserveOriginal setting.
  const customOrOriginalText = addText || (preserveOriginal ? baseName : "");
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

/** A factory function which creates an async array of renaming operations
 * for either a transform or a revert operation. Restore operations are triggered
 * if a filesToRevert argument is supplied. */
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

/** Remove entries from the list for which the renaming operation
 * resulted in a rejected promise. */
export const settledPromisesEval = <T extends G[], G extends BaseRenameItem | RenameItem>({
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
  if (promisesRejected === transformedNames.length) throw new Error(allRenameFailed);

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

export const askQuestion = (question: string): Promise<string> => {
  const rl = readline.createInterface(process.stdin, process.stdout);
  return new Promise((resolve) => {
    // eslint-disable-next-line prefer-template
    rl.question(question + "\n", (answer) => resolve(answer));
  });
};
