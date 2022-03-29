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
export const originalNames = ["original1", "original2", "original3"];
export const renameListWithIdenticalNewNames: RenameList = [
  { original: originalNames[0], rename: identicalRename, sourcePath },
  { original: originalNames[1], rename: "rename2", sourcePath },
  { original: originalNames[2], rename: identicalRename, sourcePath },
];

const renameListWithDistinctNewNames = JSON.parse(JSON.stringify(renameListWithIdenticalNewNames)) as RenameList;
renameListWithDistinctNewNames[2].rename= "rename3";

export {renameListWithDistinctNewNames};

export const truthyArgument = "argument";

