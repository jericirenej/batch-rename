import type {
  AreNewNamesDistinct,
  CheckPath,
  CleanUpRollbackFile,
  ComposeRenameString,
  CreateBatchRenameList,
  DetermineDir,
  ExtractBaseAndExt,
  ListFiles,
} from "../types.js";

import { existsSync } from "fs";
import { lstat, readdir, rename, unlink } from "fs/promises";
import { join, resolve } from "path";

import {
  DEFAULT_SEPARATOR,
  EXT_REGEX,
  ROLLBACK_FILE_NAME,
} from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { truncateFile } from "./truncateTransform.js";

const {
  CLEAN_ROLLBACK_NO_FILE_EXISTS,
  CHECK_PATH_DOES_NOT_EXIST,
  CHECK_PATH_NOT_A_DIR,
  CHECK_PATH_NO_CHILD_FILES,
} = ERRORS;

export const cleanUpRollbackFile: CleanUpRollbackFile = async (args) => {
  try {
    const { transformPath } = args;
    const targetDir = determineDir(transformPath);
    const targetPath = resolve(targetDir, ROLLBACK_FILE_NAME);
    const rollBackFileExists = existsSync(targetPath);
    if (!rollBackFileExists) {
      throw new Error(CLEAN_ROLLBACK_NO_FILE_EXISTS);
    }
    process.stdout.write("Deleting rollback file...");
    await unlink(targetPath);
    process.stdout.write("DONE!");
  } catch (err) {
    throw err;
  }
};

/**Will separate the basename and file extension. If no extension is found, it will
 * return the whole file name under the base property and an empty ext string
 */
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

export const areNewNamesDistinct: AreNewNamesDistinct = (renameList) => {
  const newNames = renameList.map((singleDatum) => singleDatum.rename);
  const allDistinct = !newNames.some(
    (newName) => newNames.filter((someName) => someName === newName).length > 1
  );
  return allDistinct;
};

export const checkPath: CheckPath = async (path) => {
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) {
    throw new Error(CHECK_PATH_DOES_NOT_EXIST);
  }
  const isDir = (await lstat(fullPath)).isDirectory();
  if (!isDir) {
    throw new Error(CHECK_PATH_NOT_A_DIR);
  }
  const dirInfo = await readdir(fullPath, { withFileTypes: true });
  const hasFiles = dirInfo.filter((childNode) => childNode.isFile()).length > 0;
  if (!hasFiles) {
    throw new Error(CHECK_PATH_NO_CHILD_FILES);
  }
  return fullPath;
};

export const determineDir: DetermineDir = (transformPath) =>
  transformPath ? transformPath : process.cwd();

export const composeRenameString: ComposeRenameString = (args) => {
  const {
    baseName: _baseName,
    ext,
    customText,
    textPosition,
    separator,
    preserveOriginal,
    newName,
    truncate,
  } = args;
  const position = textPosition ? textPosition : "append";
  const extension = ext ? ext : "";
  let sep = "";
  // Allow for empty separator (direct concatenation)
  if (separator && separator.length) sep = separator;
  if (separator === undefined) sep = DEFAULT_SEPARATOR;
  let modifiedName = newName;
  const shouldTruncate = !isNaN(Number(truncate)) && preserveOriginal;
  let baseName = _baseName;
  if (shouldTruncate)
    baseName = truncateFile({
      baseName,
      preserveOriginal,
      truncate: truncate!,
    });
  const additionalText = customText
    ? customText
    : preserveOriginal
    ? baseName
    : "";
  if (additionalText) {
    if (position === "append") {
      modifiedName = `${newName}${sep}${additionalText}`;
    }
    if (position === "prepend") {
      modifiedName = `${additionalText}${sep}${newName}`;
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
