import type {
  AreNewNamesDistinct,
  CheckPath,
  CleanUpRollbackFile,
  ComposeRenameString,
  ComposeRenameStringArgs,
  DetermineDir,
  ExtractBaseAndExt,
  ListFiles,
} from "../types.js";

import { existsSync } from "fs";
import { lstat, readdir, unlink } from "fs/promises";
import { resolve } from "path";

import { DEFAULT_SEPARATOR, ROLLBACK_FILE_NAME } from "../constants.js";

export const cleanUpRollbackFile: CleanUpRollbackFile = async (args) => {
  try {
    const { transformPath } = args;
    const targetDir = determineDir(transformPath);
    const targetPath = resolve(targetDir, ROLLBACK_FILE_NAME);
    const rollBackFileExists = existsSync(targetPath);
    if (!rollBackFileExists) {
      console.log("No rollback file exists. Exiting.");
      throw new Error();
    }
    process.stdout.write("Deleting rollback file...");
    await unlink(targetPath);
    process.stdout.write("DONE!");
  } catch (err) {
    process.stdout.write("FAILED!");
    throw new Error("Cleaning up rollback file failed!");
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
  return !renameList.every(
    (renameInfo) => renameInfo.original === renameInfo.rename
  );
};

export const checkPath: CheckPath = async (path) => {
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) {
    throw new Error("Target path does not exist!");
  }
  const isDir = (await lstat(fullPath)).isDirectory();
  if (!isDir) {
    throw new Error("Target path is not a directory!");
  }
  const dirInfo = await readdir(fullPath, { withFileTypes: true });
  const hasFiles = dirInfo.filter((childNode) => childNode.isFile()).length > 0;
  if (!hasFiles) {
    throw new Error("Directory has no children file entries!");
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
  const position = textPosition ? textPosition : "prepend";
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
  return `${modifiedName}${ext}`;
};
