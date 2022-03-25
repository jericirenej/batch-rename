import type { RenameList } from "../types.js";

export const mockFileList = [
  "someFile.with.extra.dots.ext",
  "shortFile.ext",
  "fileWithoutExt",
  ".startWithDot",
  ".startWithDot.ext",
];
export const examplePath = "A:/path/to/file";
export const expectedSplit = [
  ["someFile.with.extra.dots", ".ext"],
  ["shortFile", ".ext"],
  ["fileWithoutExt", ""],
  [".startWithDot", ""],
  [".startWithDot", ".ext"],
];

const identicalRename = "rename1";
const sourcePath = examplePath;
export const renameListWithIdenticalNewNames: RenameList = [
  { original: "original1", rename: identicalRename, sourcePath },
  { original: "original2", rename: "rename2", sourcePath },
  { original: "original3", rename: identicalRename, sourcePath },
];

const renameListWithDistinctNewNames = JSON.parse(JSON.stringify(renameListWithIdenticalNewNames)) as RenameList;
renameListWithDistinctNewNames[2].rename= "original3";

export {renameListWithDistinctNewNames};

export const truthyArgument = "argument";
