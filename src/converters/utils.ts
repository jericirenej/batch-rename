import { existsSync } from "fs";
import { lstat, readdir, rename, unlink } from "fs/promises";
import { join, resolve } from "path";
import {
  DEFAULT_SEPARATOR,
  EXT_REGEX,
  ROLLBACK_FILE_NAME
} from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  AreNewNamesDistinct,
  CheckPath,
  CleanUpRollbackFile,
  ComposeRenameString,
  CreateBatchRenameList,
  DetermineDir,
  ExtractBaseAndExt,
  ListFiles,
  NumberOfDuplicatedNames,
  TruncateFileName
} from "../types.js";

const { pathDoesNotExist, pathIsNotDir, noChildFiles } = ERRORS.utils;
const { truncateInvalidArgument } = ERRORS.transforms;
const { noRollbackFile } = ERRORS.cleanRollback;

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

/**Will separate the basename and file extension. If no extension is found, it will
 * return the whole file name under the base property and an empty ext string. */
export const extractBaseAndExt: ExtractBaseAndExt = (fileList, sourcePath) => {
  const regex = EXT_REGEX;
  return fileList.map((file) => {
    const extPosition = file.search(regex);
    if (extPosition !== -1) {
      return {
        baseName: file.slice(0, extPosition),
        ext: file.slice(extPosition),
        sourcePath,
      };
    }
    return { baseName: file, ext: "", sourcePath };
  });
};

export const listFiles: ListFiles = async (transformPath, excludeFilter) => {
  const targetDir = determineDir(transformPath);
  const dirContent = await readdir(targetDir, { withFileTypes: true });
  let files = dirContent
    .filter(
      (dirEntry) => dirEntry.isFile() && dirEntry.name !== ROLLBACK_FILE_NAME
    )
    .map((fileDirEntry) => fileDirEntry.name);
  if (excludeFilter) {
    const regex = new RegExp(excludeFilter);
    files = files.filter((fileName) => !regex.test(fileName));
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
    @param {"results"|"transforms"} args.checkType - If 'results' are specified,functions checks if there are duplicated among the transformed names. 
    If 'transforms' are specified, it checks whether there exist identical old and new names.
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

export const checkPath: CheckPath = async (path) => {
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) {
    throw new Error(pathDoesNotExist);
  }
  const isDir = (await lstat(fullPath)).isDirectory();
  if (!isDir) {
    throw new Error(pathIsNotDir);
  }
  const dirInfo = await readdir(fullPath, { withFileTypes: true });
  const hasFiles = dirInfo.filter((childNode) => childNode.isFile()).length > 0;
  if (!hasFiles) {
    throw new Error(noChildFiles);
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
