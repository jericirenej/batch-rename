import { existsSync } from "fs";
import { lstat, readdir } from "fs/promises";
import { resolve } from "path";
import { DEFAULT_TARGET_TYPE, EXT_REGEX, ROLLBACK_FILE_NAME } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import { CheckPath, DetermineDir, ExtractBaseAndExt, ListFiles } from "../types.js";

const {
  pathDoesNotExist,
  pathIsNotDir,
  noChildFiles,
  noChildDirs,
  noChildEntries,
} = ERRORS.utils;

export const jsonParseReplicate = <T>(arg: string): T => JSON.parse(arg) as T;
export const jsonReplicate = <T>(arg: T): T => jsonParseReplicate(JSON.stringify(arg)) as T;
export const sortedJsonReplicate = <T extends unknown[]>(arg: T): T => jsonReplicate(arg).sort();


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
