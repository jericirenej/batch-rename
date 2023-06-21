import { Dirent, Stats } from "fs";

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
export const mockFileNames = [
  "someFile.with.extra.dots.ext",
  "shortFile.ext",
  "fileWithoutExt",
  ".startWithDot",
  ".startWithDot.ext",
  "UTF-čšžäöüéŁ.ext",
  "12345-and-chars.ext",
];
const mockFileList: Dirent[] = mockFileNames.map((fileName) => ({
  name: fileName,
  ...mockDirentEntryAsFile,
}));

const examplePath = "A:/path/to/file";

const expectedSplit = [
  ["someFile.with.extra.dots", ".ext"],
  ["shortFile", ".ext"],
  ["fileWithoutExt", ""],
  [".startWithDot", ""],
  [".startWithDot", ".ext"],
  ["UTF-čšžäöüéŁ", ".ext"],
  ["12345-and-chars", ".ext"],
];

const truthyArgument = "argument";
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
const exampleStats: Stats = {
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

const exampleDirent: Dirent = { name: "0", ...exampleStatMethods };

/** Create a direntArray with specified number of file and dir entries.
 * If file and dir entries exceed the specified length of the array,
 * the array will be extended. */
const createDirentArray = (length: number, numberOfFiles = 0, numberOfDirs = 0): Dirent[] => {
  let counter = 1;
  const combinedLength = numberOfDirs + numberOfFiles;
  const arrLength = combinedLength > length ? combinedLength : length;
  const arr = new Array(arrLength).fill(0);
  return arr.map((entry, index) => {
    const isFileReturn = counter <= numberOfFiles;
    const isDirReturn = numberOfDirs > 0 && counter > numberOfFiles;
    counter += 1;
    return {
      ...exampleStatMethods,
      isFile: () => isFileReturn,
      isDirectory: () => isDirReturn,
      name: index.toString(),
    };
  });
};

export const mocks = {
  exampleDirent,
  createDirentArray,
  mockDirentEntryAsFile,
  examplePath,
  exampleStats,
  expectedSplit,
  mockFileList,
  mockFileNames,
  truthyArgument,
};
