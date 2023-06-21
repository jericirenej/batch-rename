import type {
  BaseRenameItem,
  ExtractBaseAndExtReturn,
  ExtractBaseAndExtTemplate,
  LegacyRenameList,
  PromiseRejectedWriteResult,
  RenameItem,
  RenameItemsArray,
  RollbackFile,
} from "@batch-rename/lib";
import { join } from "path";

import { extractBaseAndExt, mocks } from "@batch-rename/lib";

export const {
  mockDirentEntryAsFile,
  createDirentArray,
  exampleDirent,
  examplePath,
  exampleStats,
  expectedSplit,
  mockFileList,
  mockFileNames,
  truthyArgument,
} = mocks;

const ext = ".ext";
export const mockKeepList: ExtractBaseAndExtReturn = [
  { baseName: "Description-Part001-Introduction", ext },
  { baseName: "Description-Part002-Main", ext },
  { baseName: "Description-Part003-Conclusion", ext },
  { baseName: "Addendum-Part004-Index", ext },
].map((fileInfo) => ({ ...fileInfo, sourcePath: examplePath, type: "file" }));

const sourcePath = examplePath;

export const mockSplitFile: ExtractBaseAndExtTemplate = {
  baseName: "baseName",
  ext: ".ext",
  sourcePath: "sourcePath",
  type: "file",
};

export const generateMockSplitFileList = (length: number) =>
  new Array(length).fill(0).map((entry, index) => {
    const singleEntry = {
      ...mockSplitFile,
      baseName: `baseName${index + 1}`,
    };
    return singleEntry;
  });

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
export const textFormatRenameList = extractBaseAndExt(formatFileList, examplePath);

// MOCK ROLLBACK TOOLSET
const mockItemFunction = (name: string, referenceId: string, transform: number): RenameItem => ({
  original: `${name}_${transform}`,
  referenceId,
  rename: `${name}_${transform + 1}`,
});
const [mockItem1, mockItem2, mockItem3, mockItem4] = [
  (transform: number) => mockItemFunction("1st", "1", transform),
  (transform: number) => mockItemFunction("2nd", "2", transform),
  (transform: number) => mockItemFunction("3rd", "3", transform),
  (transform: number) => mockItemFunction("4th", "4", transform),
];
const mockTransforms: RenameItemsArray[] = [
  [mockItem3(2), mockItem1(4), mockItem2(3)],
  [mockItem1(3), mockItem3(1)],
  [mockItem1(2), mockItem4(1), mockItem2(2)],
  [mockItem1(1), mockItem2(1)],
];
const mockRollbackFile: RollbackFile = {
  sourcePath: examplePath,
  transforms: mockTransforms,
};

const removeReference = (...items: RenameItemsArray): BaseRenameItem[] =>
  items.map(({ original, rename }) => ({ original, rename }));

const mockLegacyRollback: LegacyRenameList = mockRollbackFile.transforms[0].map(
  ({ original, rename }) => ({
    original,
    rename,
    sourcePath: mockRollbackFile.sourcePath,
  })
);

export const mockRollbackToolSet = {
  sourcePath: examplePath,
  removeReference,
  mockItemFunction,
  mockItems: { mockItem1, mockItem2, mockItem3, mockItem4 },
  mockTransforms,
  mockRollbackFile,
  mockLegacyRollback,
};

// RENAME LIST TOOLSET
const originalNames = ["original1", "original2", "original3"];
const singleLevelTransform = originalNames.map((name) => mockItemFunction(name, `${name}_ID`, 1));
const distinct = removeReference(...singleLevelTransform);
const newNameRepeat = distinct.map((entry, index, arr) => {
  if (index !== arr.length - 1) return { ...entry };
  return { ...entry, rename: arr[index - 1].rename };
});

const duplicateOriginalAndRename = distinct.map((entry, index, arr) => {
  if (index === 0) return { ...entry, rename: entry.original };
  return { ...entry };
});

const renameLists = {
  distinct,
  newNameRepeat,
  duplicateOriginalAndRename,
} as const;
interface RenameListToolSet {
  originalNames: string[];
  renameLists: typeof renameLists;
  mockRollback: RollbackFile;
}

export const mockRenameListToolSet: RenameListToolSet = {
  originalNames,
  renameLists,
  mockRollback: { sourcePath, transforms: [singleLevelTransform] },
};

export const generateRejected = (
  { original, rename }: RenameItem | BaseRenameItem,
  operationType: "convert" | "restore" = "restore"
): PromiseRejectedWriteResult =>
  ({
    status: "rejected",
    reason: {
      path: join(sourcePath, operationType === "restore" ? rename : original),
      dest: join(sourcePath, operationType === "restore" ? original : rename),
    },
  } as PromiseRejectedWriteResult);
