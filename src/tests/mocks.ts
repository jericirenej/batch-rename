import { Dirent, Stats } from "fs";
import { extractBaseAndExt } from "../converters/utils.js";
import type {
  ExtractBaseAndExtReturn,
  ExtractBaseAndExtTemplate, LegacyRenameList, RenameItemsArray, RenameList
} from "../types.js";

export const mockDirentEntryAsFile: Omit<Dirent, "name"> = {
  isFile() {
    return true;
  },
  isDirectory() {
    return false;
  },
  isBlockDevice() {
    return false;
  },
  isCharacterDevice() {
    return false;
  },
  isSymbolicLink() {
    return false;
  },
  isFIFO() {
    return false;
  },
  isSocket() {
    return false;
  },
};
export const mockFileList: Dirent[] = [
  "someFile.with.extra.dots.ext",
  "shortFile.ext",
  "fileWithoutExt",
  ".startWithDot",
  ".startWithDot.ext",
  "UTF-čšžäöüéŁ.ext",
  "12345-and-chars.ext",
].map((fileName) => ({ name: fileName, ...mockDirentEntryAsFile }));

const ext = ".ext";
export const examplePath = "A:/path/to/file";
export const mockKeepList: ExtractBaseAndExtReturn = [
  { baseName: "Description-Part001-Introduction", ext },
  { baseName: "Description-Part002-Main", ext },
  { baseName: "Description-Part003-Conclusion", ext },
  { baseName: "Addendum-Part004-Index", ext },
].map((fileInfo) => ({ ...fileInfo, sourcePath: examplePath, type: "file" }));

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
export const renameWithNewNameRepeat: LegacyRenameList = [
  { original: originalNames[0], rename: firstRename, sourcePath },
  { original: originalNames[1], rename: "rename2", sourcePath },
  { original: originalNames[2], rename: firstRename, sourcePath },
];

export const renameListDistinct = JSON.parse(
  JSON.stringify(renameWithNewNameRepeat)
) as LegacyRenameList;
renameListDistinct[2].rename = "rename3";
export const renameListWithDuplicateOldAndNew = JSON.parse(
  JSON.stringify(renameListDistinct)
) as LegacyRenameList;
renameListWithDuplicateOldAndNew[0] = {
  original: renameListDistinct[0].original,
  rename: renameListDistinct[0].original,
  sourcePath,
};

export const newRenameList: RenameItemsArray = renameListDistinct.map(
  ({ original, rename }, index) => ({
    original,
    rename,
    referenceId: `000${index+1}`,
  })
);
export const newRenameListLevel: RenameList = {
  sourcePath,
  transforms: [
    newRenameList.map(({ referenceId}, index) => ({
      original: `secondRename${index+1}`,
      rename: `thirdRename${index+1}`,
      referenceId,
    })).reverse(),
    newRenameList.map(({ referenceId, rename}, index) => ({
      original: rename,
      rename: `secondRename${index+1}`,
      referenceId,
    })).reverse(),
    newRenameList,
  ],
};

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

/**Create a direntArray with specified number of file and dir entries.
 * If file and dir entries exceed the specified length of the array,
 * the array will be extended.
 */
export const createDirentArray = (
  length: number,
  numberOfFiles = 0,
  numberOfDirs = 0
): Dirent[] => {
  let counter = 1;
  const combinedLength = numberOfDirs + numberOfFiles;
  const arrLength = combinedLength > length ? combinedLength : length;
  const arr = new Array(arrLength).fill(0);
  return arr.map((entry, index) => {
    const isFileReturn = counter <= numberOfFiles;
    const isDirReturn = numberOfDirs > 0 && counter > numberOfFiles;
    counter++;
    return {
      ...exampleStatMethods,
      isFile: () => isFileReturn,
      isDirectory: () => isDirReturn,
      name: index.toString(),
    };
  });
};

export const mockSplitFile: ExtractBaseAndExtTemplate = {
  baseName: "baseName",
  ext: ".ext",
  sourcePath: "sourcePath",
  type: "file",
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
const formatFileList = textFormatMatrix.map((example) => ({
  name: example.value,
  ...mockDirentEntryAsFile,
}));
export const textFormatRenameList = extractBaseAndExt(
  formatFileList,
  examplePath
);
