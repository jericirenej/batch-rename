import { Dirent, Stats } from "fs";
import { extractBaseAndExt } from "../converters/utils.js";
import type { ExtractBaseAndExtTemplate, RenameList } from "../types.js";

export const mockFileList = [
  "someFile.with.extra.dots.ext",
  "shortFile.ext",
  "fileWithoutExt",
  ".startWithDot",
  ".startWithDot.ext",
  "UTF-čšžäöüéŁ.ext",
  "12345-and-chars.ext",
];
export const examplePath = "A:/path/to/file";
export const expectedSplit = [
  ["someFile.with.extra.dots", ".ext"],
  ["shortFile", ".ext"],
  ["fileWithoutExt", ""],
  [".startWithDot", ""],
  [".startWithDot", ".ext"],
  ["UTF-čšžäöüéŁ", ".ext"],
  ["12345-and-chars", ".ext"],
];

const firstRename = "rename1";
const sourcePath = examplePath;
export const originalNames = ["original1", "original2", "original3"];
export const renameWithNewNameRepeat: RenameList = [
  { original: originalNames[0], rename: firstRename, sourcePath },
  { original: originalNames[1], rename: "rename2", sourcePath },
  { original: originalNames[2], rename: firstRename, sourcePath },
];

const renameListDistinct = JSON.parse(
  JSON.stringify(renameWithNewNameRepeat)
) as RenameList;
renameListDistinct[2].rename = "rename3";
const renameListWithDuplicateOldAndNew = JSON.parse(
  JSON.stringify(renameListDistinct)
) as RenameList;
renameListWithDuplicateOldAndNew[0] = {
  original: renameListDistinct[0].original,
  rename: renameListDistinct[0].original,
  sourcePath,
};

export { renameListDistinct, renameListWithDuplicateOldAndNew };

export const truthyArgument = "argument";
const madeUpTime = 1318289051000.1;
const madeUpDate = new Date(madeUpTime);

const exampleStatMethods = {
  isBlockDevice: () => true,
  isFile: () => true,
  isDirectory: () => true,
  isCharacterDevice: () => true,
  isFIFO: () => true,
  isSocket: () => true,
  isSymbolicLink: () => true,
};
export const exampleStats: Stats = {
  dev: 2114,
  ino: 48064969,
  mode: 33188,
  nlink: 1,
  uid: 85,
  gid: 100,
  rdev: 0,
  size: 527,
  blksize: 4096,
  blocks: 8,
  atimeMs: madeUpTime,
  mtimeMs: madeUpTime,
  ctimeMs: madeUpTime,
  birthtimeMs: madeUpTime,
  atime: madeUpDate,
  mtime: madeUpDate,
  ctime: madeUpDate,
  birthtime: madeUpDate,
  ...exampleStatMethods,
};

export const exampleDirent: Dirent = { name: "0", ...exampleStatMethods };

export const createDirentArray = (
  length: number,
  numberOfFiles = 0
): Dirent[] => {
  let counter = 1;
  const arr = new Array(length).fill(0);
  const filesNum = numberOfFiles > length ? length : numberOfFiles;
  return arr.map((entry, index) => {
    const isFileReturn = counter <= filesNum;
    counter++;
    return {
      ...exampleStatMethods,
      isFile: () => isFileReturn,
      name: index.toString(),
    };
  });
};

export const mockSplitFile: ExtractBaseAndExtTemplate = {
  baseName: "baseName",
  ext: ".ext",
  sourcePath: "sourcePath",
};

export const generateMockSplitFileList = (length: number) => {
  return new Array(length).fill(0).map((entry, index) => {
    const singleEntry = {
      ...mockSplitFile,
      baseName: `baseName${index + 1}`,
    };
    return singleEntry;
  });
};

export const textFormatMatrix = [
  {
    value: "someFile",
    expected: {
      uppercase: "SOMEFILE",
      lowercase: "somefile",
      capitalize: "Somefile",
    },
  },
  {
    value: "SOME_FILE.ext",
    expected: {
      uppercase: "SOME_FILE.EXT",
      lowercase: "some_file.ext",
      capitalize: "Some_file.ext",
    },
  },
  {
    value: "sOMe FiLe wi12th Different wOrDs.ext",
    expected: {
      uppercase: "SOME FILE WI12TH DIFFERENT WORDS.EXT",
      lowercase: "some file wi12th different words.ext",
      capitalize: "Some File Wi12th Different Words.ext",
    },
  },
];
const formatFileList = textFormatMatrix.map((example) => example.value);
export const textFormatRenameList = extractBaseAndExt(formatFileList, examplePath);

