import { writeFile } from "fs/promises";
import * as converter from "../converters/converter.js";
import * as dateTransformFunctions from "../converters/dateTransform.js";
import * as numericTransformFunctions from "../converters/numericTransform.js";
import * as searchAndReplaceTransformFunctions from "../converters/searchAndReplace.js";
import * as truncateTransformFunctions from "../converters/truncateTransform.js";
import * as utils from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  DryRunTransformArgs,
  RenameListArgs,
  TransformTypes,
} from "../types.js";
import {
  examplePath,
  exampleStats,
  generateMockSplitFileList,
  mockFileList,
  renameListDistinct,
  renameWithNewNameRepeat,
} from "./mocks.js";

jest.mock("fs/promises", () => {
  const originalModule = jest.requireActual("fs/promises");
  return {
    __esModule: true,
    ...originalModule,
    writeFile: jest.fn(),
  };
});
const mockedWriteFile = jest
  .mocked(writeFile)
  .mockImplementation((path, data, options) => Promise.resolve());

const splitFileList = generateMockSplitFileList(10);

const { convertFiles, dryRunTransform, generateRenameList } = converter;

const createSpyOnProcessWrite = () =>
  jest.spyOn(process.stdout, "write").mockImplementation();
const createSpyOnLog = () =>
  jest.spyOn(console, "log").mockImplementation((message?: string) => {});

const restoreMocks = (...spies: jest.SpyInstance[]) =>
  spies.forEach((spy) => spy.mockRestore());

const splitFileListWithStats = splitFileList.map((fileList) => ({
  ...fileList,
  stats: exampleStats,
}));

const spyOnGenerateRenameList = jest.spyOn(converter, "generateRenameList"),
  spyOnDryRunTransform = jest.spyOn(converter, "dryRunTransform"),
  spyOnTruncateTransform = jest.spyOn(
    truncateTransformFunctions,
    "truncateTransform"
  ),
  spyOnNumericTransform = jest.spyOn(
    numericTransformFunctions,
    "numericTransform"
  ),
  spyOnDateTransform = jest.spyOn(dateTransformFunctions, "dateTransform"),
  spyOnSearchAndReplace = jest.spyOn(
    searchAndReplaceTransformFunctions,
    "searchAndReplace"
  ),
  spyOnCreateBatchRename = jest
    .spyOn(utils, "createBatchRenameList")
    .mockReturnValue([Promise.resolve()]),
  sypOnDetermineDir = jest.spyOn(utils, "determineDir"),
  spyOnListFiles = jest
    .spyOn(utils, "listFiles")
    .mockResolvedValue(mockFileList),
  spyOnExtractBaseAndExt = jest
    .spyOn(utils, "extractBaseAndExt")
    .mockReturnValue(splitFileList),
  spyOnProvideFileStats = jest
    .spyOn(dateTransformFunctions, "provideFileStats")
    .mockResolvedValue(splitFileListWithStats);

[
  spyOnDateTransform,
  spyOnSearchAndReplace,
  spyOnNumericTransform,
  spyOnTruncateTransform,
].forEach((transformOperation) =>
  transformOperation.mockImplementation((args) => renameListDistinct)
);

describe("convertFiles", () => {
  let spyOnProcessWrite: jest.SpyInstance;
  let spyOnConsole: jest.SpyInstance;
  const spyOnAreNewNamesDistinct = jest
    .spyOn(utils, "areNewNamesDistinct")
    .mockReturnValue(true);
  const exampleArgs: RenameListArgs = {
    transformPattern: ["numericTransform"],
    transformPath: examplePath,
    exclude: "exclude",
    dryRun: false,
  };
  beforeEach(() => {
    spyOnGenerateRenameList.mockImplementation();
    [spyOnProcessWrite, spyOnConsole] = [
      createSpyOnProcessWrite(),
      createSpyOnLog(),
    ];
  });
  afterEach(() => {
    jest.clearAllMocks();
    [spyOnProcessWrite, spyOnConsole].forEach((spy) => spy.mockRestore());
  });
  afterAll(() => spyOnAreNewNamesDistinct.mockRestore());
  it("Should dryRunTransform, if dryRun is true", async () => {
    spyOnDryRunTransform.mockImplementation();
    await convertFiles(exampleArgs);
    expect(spyOnDryRunTransform).not.toHaveBeenCalled();
    await convertFiles({ ...exampleArgs, dryRun: true });
    expect(spyOnDryRunTransform).toHaveBeenCalled();
  });
  it("Should call determineDir, listFiles, extractBaseAndExt, generateRenameList, areNewNamesDistinct, createBatchRenameList", async () => {
    await convertFiles(exampleArgs);
    [
      sypOnDetermineDir,
      spyOnListFiles,
      spyOnExtractBaseAndExt,
      spyOnGenerateRenameList,
      spyOnAreNewNamesDistinct,
      spyOnCreateBatchRename,
    ].forEach((auxFunction) => expect(auxFunction).toHaveBeenCalledTimes(1));
  });
  it("Should include exclude argument in listFiles, if provided", async () => {
    sypOnDetermineDir
      .mockReturnValueOnce(examplePath)
      .mockReturnValueOnce(examplePath);
    await convertFiles(exampleArgs);
    expect(spyOnListFiles).toHaveBeenLastCalledWith(
      examplePath,
      exampleArgs.exclude
    );
    await convertFiles({ ...exampleArgs, exclude: undefined });
    expect(spyOnListFiles).toHaveBeenLastCalledWith(examplePath, undefined);
  });
  it("Should run provideFileStats with dateTransform", async () => {
    await convertFiles(exampleArgs);
    expect(spyOnProvideFileStats).not.toHaveBeenCalled();
    await convertFiles({ ...exampleArgs, transformPattern: ["dateRename"] });
    expect(spyOnProvideFileStats).toHaveBeenCalledTimes(1);
  });
  it("Should provide generateRenameList with base splitFileList or a fileList with stats, depending on transformType", async () => {
    await convertFiles(exampleArgs);
    let lastCalled = spyOnGenerateRenameList.mock.calls.slice(-1).flat();
    expect(lastCalled[0].splitFileList).toEqual(splitFileList);
    await convertFiles({ ...exampleArgs, transformPattern: ["dateRename"] });
    lastCalled = spyOnGenerateRenameList.mock.calls.slice(-1).flat();
    expect(lastCalled[0].splitFileList).toEqual(splitFileListWithStats);
  });
  it("Should call areNewNamesDistinct and createBatchRename with result from generateRenameList", async () => {
    spyOnGenerateRenameList.mockReturnValueOnce(renameListDistinct);
    await convertFiles(exampleArgs);
    expect(spyOnAreNewNamesDistinct).toHaveBeenCalledWith(renameListDistinct);
    expect(spyOnCreateBatchRename).toHaveBeenCalledWith(renameListDistinct);
  });
  it("Should throw error, if duplication of names occurs", async () => {
    spyOnAreNewNamesDistinct.mockReturnValueOnce(false);
    await expect(() => convertFiles(exampleArgs)).rejects.toThrowError(
      ERRORS.DUPLICATE_FILE_NAMES
    );
  });
  it("Should call writeFile and process stdout for rollbackFile write", async () => {
    spyOnGenerateRenameList.mockReturnValueOnce(renameListDistinct);
    await convertFiles(exampleArgs);
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    expect(spyOnProcessWrite).toHaveBeenCalledTimes(2);
  });
  it("Should await results from createBatchRenameList operation", async () => {
    const mockBatchPromises = [0, 1, 2, 3].map((num) => Promise.resolve());
    spyOnCreateBatchRename.mockReturnValueOnce(mockBatchPromises);

    const spyOnPromiseAll = jest.spyOn(Promise, "all");
    await convertFiles(exampleArgs);
    expect(spyOnPromiseAll).toHaveBeenCalledTimes(1);
    expect(spyOnPromiseAll).toHaveBeenCalledWith(mockBatchPromises);
    spyOnPromiseAll.mockRestore();
  });
  it("Should call console.log twice", async () => {
    await convertFiles(exampleArgs);
    expect(spyOnConsole).toHaveBeenCalledTimes(2);
  });
});

describe("generateRenameList", () => {
  afterEach(() => jest.clearAllMocks());
  // Only valid transform combinations are evaluated. Invalid ones should be
  // either be filtered out or throw an exception during
  // the argument parsing phase.
  it("Should call truncateTransform only if truncate is the single transform argument", () => {
    generateRenameList({
      transformPattern: ["truncate"],
      splitFileList,
    });
    expect(spyOnTruncateTransform).toHaveBeenCalledTimes(1);
    spyOnTruncateTransform.mockClear();
    generateRenameList({
      transformPattern: ["truncate", "dateRename"],
      splitFileList,
    });
    expect(spyOnTruncateTransform).not.toHaveBeenCalled();
  });
  it("Should call dateRename, if it is included in transformPattern", () => {
    const transforms: TransformTypes[][] = [
      ["dateRename"],
      ["dateRename", "truncate"],
    ];
    transforms.forEach((transformPattern, index) => {
      generateRenameList({ transformPattern, splitFileList });
      expect(spyOnDateTransform).toHaveBeenCalledTimes(index + 1);
    });
  });
  it("Should call numericTransform, if it is included in transformPattern", () => {
    const transforms: TransformTypes[][] = [
      ["numericTransform"],
      ["numericTransform", "truncate"],
    ];
    transforms.forEach((transformPattern, index) => {
      generateRenameList({ transformPattern, splitFileList });
      expect(spyOnNumericTransform).toHaveBeenCalledTimes(index + 1);
    });
  });
  it("Should call searchAndReplace transform, if it is included in transformPattern", () => {
    const transforms: TransformTypes[][] = [
      ["searchAndReplace"],
      ["searchAndReplace", "truncate"],
    ];
    transforms.forEach((transformPattern, index) => {
      generateRenameList({ transformPattern, splitFileList });
      expect(spyOnSearchAndReplace).toHaveBeenCalledTimes(index + 1);
    });
  });
  it("Should throw error, if no transformation function is returned", () => {
    const transformPattern = ["invalidType"] as unknown as TransformTypes[];
    expect(() =>
      generateRenameList({ transformPattern, splitFileList })
    ).toThrowError(ERRORS.TRANSFORM_NO_FUNCTION_AVAILABLE);
  });
});

describe("dryRunTransform", () => {
  it("Should call console log appropriate number of times", () => {
    const spyOnAreNewNamesDistinct = jest.spyOn(utils, "areNewNamesDistinct");
    const spyOnConsole = createSpyOnLog();
    const exampleArgs: DryRunTransformArgs = {
      transformPath: examplePath,
      transformPattern: ["searchAndReplace"],
      transformedNames: renameListDistinct,
    };
    dryRunTransform(exampleArgs);
    const expected = renameListDistinct.length + 1;
    expect(spyOnConsole).toHaveBeenCalledTimes(expected);

    spyOnConsole.mockClear();

    dryRunTransform({
      ...exampleArgs,
      transformedNames: renameWithNewNameRepeat,
    });
    expect(spyOnConsole).toHaveBeenCalledTimes(expected + 1);
    expect(spyOnAreNewNamesDistinct).toHaveBeenCalledTimes(2);
    spyOnConsole.mockRestore();
  });
});
