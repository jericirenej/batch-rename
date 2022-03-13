import { rename, readdir, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { MIN_NUMBER_LENGTH, ROLLBACK_FILE_NAME } from "./constants";
import {
  ExtractBaseAndExt,
  ExtractBaseAndExtReturn,
  TransformTypes,
} from "./types";
const renameFiles = async (transformType: TransformTypes): Promise<void> => {
  const splitFiles = await listFiles().then((fileList) =>
    extractBaseAndExt(fileList)
  );
  const transformedNames = generateRenameList(splitFiles, transformType);
  await writeFile(
    path.resolve(process.cwd(), ROLLBACK_FILE_NAME),
    JSON.stringify(transformedNames, undefined, 2),
    "utf-8"
  );
  console.log(JSON.stringify(transformedNames, undefined, 2));
};

const listFiles = async (): Promise<string[]> => {
  const currentDir = process.cwd();
  const dirContent = await readdir(currentDir, { withFileTypes: true });
  const files = dirContent
    .filter((dirEntry) => dirEntry.isFile())
    .map((fileDirEntry) => fileDirEntry.name);
  return files;
};

/**Will separate the basename and file extension. If no extension is found, it will
 * return the whole file name under the base property and an empty ext string
 */
const extractBaseAndExt: ExtractBaseAndExt = (fileList) => {
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

/**General renaming function that will call relevant transformer. Currently, it will just call the evenOddTransform, but it could also support other transform types or custom transform functions */
const generateRenameList = (
  splitFileList: ExtractBaseAndExtReturn,
  transformPattern: TransformTypes
): { rename: string; original: string }[] => {
  const isEvenOddTransform = ["even", "odd"].some((pattern) =>
    transformPattern.includes(pattern)
  );
  if (isEvenOddTransform) {
    return evenOddTransform(splitFileList, transformPattern);
  }
  // Return list with no transform
  return splitFileList.map((splitFile) => {
    const { ext, baseName } = splitFile;
    const completeFile = baseName + ext;
    return { rename: completeFile, original: completeFile };
  });
};

const evenOddTransform = (
  splitFileList: ExtractBaseAndExtReturn,
  transformPattern: TransformTypes
) => {
  return splitFileList.map((splitFile, index) => {
    const { ext, baseName } = splitFile;
    let sequenceNumber = index * 2;
    if (transformPattern === "odd") sequenceNumber += 1;

    let stringifiedNum = sequenceNumber.toString();
    const diffToMinLength = MIN_NUMBER_LENGTH - stringifiedNum.length;
    if (diffToMinLength > 0) {
      const prePend = new Array(diffToMinLength).fill("0").join("");
      stringifiedNum = prePend + stringifiedNum;
    }
    return { rename: `${stringifiedNum}${ext}`, original: baseName + ext };
  });
};

const cleanUpRollbackFile = async (): Promise<void> => {
  try {
    const targetPath = path.resolve(process.cwd(), ROLLBACK_FILE_NAME);
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


// (async () => await cleanUpRollbackFile())();
renameFiles("odd")