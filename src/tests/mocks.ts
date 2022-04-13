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
const renameListWithSameOriginalAndNew = JSON.parse(
  JSON.stringify(renameListDistinct)
) as RenameList;
renameListWithSameOriginalAndNew[0] = {
  original: renameListDistinct[0].original,
  rename: renameListDistinct[0].original,
  sourcePath,
};

export { renameListDistinct, renameListWithSameOriginalAndNew };

export const truthyArgument = "argument";
