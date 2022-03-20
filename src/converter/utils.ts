import { existsSync } from "fs";
import { readdir, unlink } from "fs/promises";
import { resolve } from "path";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import type { ExtractBaseAndExt } from "../types.js";

export const cleanUpRollbackFile = async (): Promise<void> => {
  try {
    const targetPath = resolve(process.cwd(), ROLLBACK_FILE_NAME);
    const rollBackFileExists = existsSync(targetPath);
    if (!rollBackFileExists) {
      console.log("No rollback file exists. Exiting.");
      return;
    }
    process.stdout.write("Deleting rollback file...");
    await unlink(targetPath);
    process.stdout.write("DONE!");
  } catch (err) {
    process.stdout.write("FAILED!");
    console.error(err);
  }
};

/**Will separate the basename and file extension. If no extension is found, it will
 * return the whole file name under the base property and an empty ext string
 */
 export const extractBaseAndExt: ExtractBaseAndExt = (fileList) => {
  const regex = /(\.\w+)$/;
  return fileList.map((file) => {
    const extPosition = file.search(regex);
    if (extPosition !== -1) {
      return {
        baseName: file.slice(0, extPosition),
        ext: file.slice(extPosition),
      };
    }
    return { baseName: file, ext: "" };
  });
};

export const listFiles = async (): Promise<string[]> => {
  const currentDir = process.cwd();
  const dirContent = await readdir(currentDir, { withFileTypes: true });
  const files = dirContent
    .filter(
      (dirEntry) => dirEntry.isFile() && dirEntry.name !== ROLLBACK_FILE_NAME
    )
    .map((fileDirEntry) => fileDirEntry.name);
  return files;
};