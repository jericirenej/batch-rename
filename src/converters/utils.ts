import type {
  AreNewNamesDistinct,
  CheckPath,
  CleanUpRollbackFile,
  ComposeRenameString,
  DetermineDir,
  ExtractBaseAndExt,
  ListFiles,
} from "../types.js";

import { existsSync } from "fs";
import { lstat, readdir, unlink } from "fs/promises";
import { resolve } from "path";

import { DEFAULT_SEPARATOR, ROLLBACK_FILE_NAME } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";

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
  const regex = /(?<=\w+)(\.\w+)$/;
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

export const listFiles: ListFiles = async (transformPath) => {
  const targetDir = determineDir(transformPath);
  const dirContent = await readdir(targetDir, { withFileTypes: true });
  const files = dirContent
    .filter(
      (dirEntry) => dirEntry.isFile() && dirEntry.name !== ROLLBACK_FILE_NAME
    )
    .map((fileDirEntry) => fileDirEntry.name);
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
    baseName,
    ext,
    customText,
    textPosition,
    separator,
    preserveOriginal,
    newName,
  } = args;
  const position = textPosition ? textPosition : "append";
  const extension = ext ? ext : "";
  const sep = separator ? separator : DEFAULT_SEPARATOR;
  let modifiedName = newName;
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
