import { writeFile } from "fs/promises";
import * as addConverter from "../converters/addTextTransform.js";
import * as converter from "../converters/converter.js";
import * as dateTransformFunctions from "../converters/dateTransform.js";
import * as numericTransformFunctions from "../converters/numericTransform.js";
import * as searchAndReplaceTransformFunctions from "../converters/searchAndReplace.js";
import * as truncateTransformFunctions from "../converters/truncateTransform.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  AreNewNamesDistinct,
  CreateBatchRenameList,
  DryRunTransformArgs,
  RenameListArgs,
  TransformTypes
} from "../types.js";
import * as rollbackUtils from "../utils/rollbackUtils.js";
import * as utils from "../utils/utils.js";
import {
  examplePath,
  exampleStats,
  generateMockSplitFileList,
  generateRejected,
  mockFileList,
  mockRenameListToolSet
} from "./mocks.js";

const { renameLists: mockRenameLists } = mockRenameListToolSet;
const { distinct: mockDistinctList } = mockRenameLists;

const splitFileList = generateMockSplitFileList(10);
const splitFileListWithStats = splitFileList.map((fileList) => ({
  ...fileList,
  stats: exampleStats,
}));
const { convertFiles, dryRunTransform, generateRenameList } = converter;
const { settledPromisesEval } = utils;

// SPIES AND MOCKS SETUP
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

const createSpyOnProcessWrite = () =>
  jest.spyOn(process.stdout, "write").mockImplementation();
const createSpyOnLog = () =>
  jest.spyOn(console, "log").mockImplementation((message?: string) => {});
const createSpyOnTable = () =>
  jest.spyOn(console, "table").mockImplementation((message?: string) => {});

const restoreMocks = (...spies: jest.SpyInstance[]) =>
  spies.forEach((spy) => spy.mockRestore());

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
  spyOnAddTextTransform = jest.spyOn(addConverter, "addTextTransform"),
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
    .mockResolvedValue(splitFileListWithStats),
  spyOnAskQuestion = jest.spyOn(utils, "askQuestion"),
  spyOnCreateRollback = jest
    .spyOn(rollbackUtils, "createRollback")
    .mockImplementation(({ transforms, sourcePath }) =>
      Promise.resolve(mockRenameListToolSet.mockRollback)
    ),
  spyOnKeepTransform = jest.spyOn(searchAndReplaceTransformFunctions, "keepTransform"),
  spyOnOmitTransform = jest.spyOn(searchAndReplaceTransformFunctions, "omitTransform");

[
  spyOnDateTransform,
  spyOnSearchAndReplace,
  spyOnNumericTransform,
  spyOnTruncateTransform,
].forEach((transformOperation) =>
  transformOperation.mockImplementation((args) => mockDistinctList)
);

describe("convertFiles", () => {
  let spyOnProcessWrite: jest.SpyInstance;
  let spyOnConsole: jest.SpyInstance;
  const spyOnAreNewNamesDistinct = jest
    .spyOn(utils, "areNewNamesDistinct")
    .mockReturnValue(true);
  const spyOnAreTransformsDistinct = jest.spyOn(utils, "areNewNamesDistinct");

  const exampleArgs: RenameListArgs = {
    transformPattern: ["numericTransform"],
    transformPath: examplePath,
    exclude: "exclude",
    dryRun: false,
    skipRollback: false,
  };
  beforeEach(() => {
    spyOnGenerateRenameList.mockImplementation((arg) => mockDistinctList);
    [spyOnProcessWrite, spyOnConsole] = [
      createSpyOnProcessWrite(),
      createSpyOnLog(),
    ];
  });
  afterEach(() => {
    jest.clearAllMocks();
    [spyOnProcessWrite, spyOnConsole].forEach((spy) => spy.mockRestore());
  });
  afterAll(() => {
    spyOnAreNewNamesDistinct.mockRestore();
    spyOnAreTransformsDistinct.mockRestore();
  });
  it("Should dryRunTransform, if dryRun is true", async () => {
    spyOnDryRunTransform.mockImplementationOnce((args) =>
      Promise.resolve(true)
    );
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
  it("Should continue execution, if dryRunTransform returns true", async () => {
    spyOnAreNewNamesDistinct.mockClear();
    spyOnAreNewNamesDistinct.mockReturnValueOnce(true);
    spyOnDryRunTransform.mockImplementationOnce((args) =>
      Promise.resolve(true)
    );
    await convertFiles({ ...exampleArgs, dryRun: true });
    expect(spyOnAreNewNamesDistinct).toHaveBeenCalledTimes(1);

    spyOnAreNewNamesDistinct.mockClear();
    spyOnDryRunTransform.mockImplementationOnce((args) =>
      Promise.resolve(false)
    );
    await convertFiles({ ...exampleArgs, dryRun: true });
    expect(spyOnAreNewNamesDistinct).not.toHaveBeenCalled();
  });
  it("Should include exclude argument in listFiles, if provided", async () => {
    sypOnDetermineDir
      .mockReturnValueOnce(examplePath)
      .mockReturnValueOnce(examplePath);
    await convertFiles(exampleArgs);
    expect(spyOnListFiles).toHaveBeenLastCalledWith(
      examplePath,
      exampleArgs.exclude,
      undefined
    );
    await convertFiles({ ...exampleArgs, exclude: undefined });
    expect(spyOnListFiles).toHaveBeenLastCalledWith(
      examplePath,
      undefined,
      undefined
    );
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
    await convertFiles(exampleArgs);
    expect(spyOnAreNewNamesDistinct).toHaveBeenCalledWith<
      Parameters<AreNewNamesDistinct>
    >(mockDistinctList);
    expect(spyOnCreateBatchRename).toHaveBeenCalledWith<
      Parameters<CreateBatchRenameList>
    >({ sourcePath: examplePath, transforms: mockDistinctList });
  });
  it("Should throw error, if duplication of names occurs", async () => {
    spyOnAreNewNamesDistinct.mockReturnValueOnce(false);
    await expect(() => convertFiles(exampleArgs)).rejects.toThrowError(
      ERRORS.transforms.duplicateRenames
    );
  });
  it("Should await results from createBatchRenameList operation", async () => {
    const mockBatchPromises = [0, 1, 2, 3].map((num) => Promise.resolve());
    spyOnCreateBatchRename.mockReturnValueOnce(mockBatchPromises);

    const spyOnPromiseAllSettled = jest.spyOn(Promise, "allSettled");
    await convertFiles(exampleArgs);
    expect(spyOnPromiseAllSettled).toHaveBeenCalledTimes(1);
    expect(spyOnPromiseAllSettled).toHaveBeenCalledWith(mockBatchPromises);
    spyOnPromiseAllSettled.mockRestore();
  });
  it("Should call settledPromisesEval with appropriate arguments", async () => {
    const mockBatchPromises = [...mockDistinctList].map(() =>
      Promise.resolve()
    );
    mockBatchPromises[0] = Promise.reject(
      generateRejected(mockDistinctList[0], "convert").reason
    );
    spyOnCreateBatchRename.mockReturnValueOnce(mockBatchPromises);
    const promiseResults = await Promise.allSettled(mockBatchPromises);
    const spyOnSettledPromisesEval = jest.spyOn(utils, "settledPromisesEval");
    await convertFiles(exampleArgs);
    spyOnProcessWrite.mockRestore();
    spyOnConsole.mockRestore();
    expect(spyOnSettledPromisesEval).toHaveBeenCalledTimes(1);
    expect(spyOnSettledPromisesEval).toHaveBeenCalledWith({
      promiseResults,
      transformedNames: mockDistinctList,
      operationType: "convert",
    });
    const expected: ReturnType<typeof settledPromisesEval> = {
      successful: mockDistinctList.slice(1),
      failed: [mockDistinctList[0]],
    };
    expect(spyOnSettledPromisesEval).toHaveReturnedWith(expected);
  });
  it("Should call writeFile and process stdout for rollbackFile write", async () => {
    await convertFiles(exampleArgs);
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    expect(spyOnProcessWrite).toHaveBeenCalledTimes(2);
  });
  it("Should call createRollback only if skipRollback is true", async () => {
    for (const skipRollback of [false, true]) {
      spyOnCreateRollback.mockClear();
      // eslint-disable-next-line no-await-in-loop
      await convertFiles({ ...exampleArgs, skipRollback });
      expect(spyOnCreateRollback).toHaveBeenCalledTimes(skipRollback ? 0 : 1);
    }
  });
});

describe("generateRenameList", () => {
  afterEach(() => jest.clearAllMocks());
  it("Should call the first supplied transform type", () => {
    const transformTypes = [
      "truncate",
      "dateRename",
      "numericTransform",
      "searchAndReplace",
      "addText",
      "keep",
      "omit",
    ] as const;
    transformTypes.forEach((transformType) =>
      generateRenameList({ transformPattern: [transformType], splitFileList })
    );
    [
      spyOnDateTransform,
      spyOnSearchAndReplace,
      spyOnNumericTransform,
      spyOnTruncateTransform,
      spyOnAddTextTransform,
      spyOnKeepTransform,
      spyOnOmitTransform,
    ].forEach((transformType) =>
      expect(transformType).toHaveBeenCalledTimes(1)
    );
  });
  it("Should throw error, if no transformation function is returned", () => {
    const transformPattern = ["invalidType"] as unknown as TransformTypes[];
    expect(() =>
      generateRenameList({ transformPattern, splitFileList })
    ).toThrowError(ERRORS.transforms.noTransformFunctionAvailable);
  });
});

describe("dryRunTransform", () => {
  const spyOnNumberOfDuplicatedNames = jest.spyOn(
      utils,
      "numberOfDuplicatedNames"
    ),
    spyOnWillOverwrite = jest.spyOn(utils, "willOverWriteExisting");
  let spyOnConsole: jest.SpyInstance, spyOnTable: jest.SpyInstance;
  const exampleArgs: DryRunTransformArgs = {
    transformPath: examplePath,
    transformPattern: ["searchAndReplace"],
    transformedNames: mockDistinctList,
    fileList: splitFileList,
  };
  beforeEach(() => {
    spyOnConsole = createSpyOnLog();
    spyOnTable = createSpyOnTable();
  });
  afterEach(() => {
    [spyOnConsole, spyOnTable].forEach((spy) => spy.mockRestore());
    [spyOnNumberOfDuplicatedNames, spyOnWillOverwrite].forEach((spy) =>
      spy.mockClear()
    );
  });
  it("Should return false, if no names would be changed by transform", async () => {
    const identicalTransform = [mockDistinctList[0]];
    identicalTransform[0].rename = identicalTransform[0].original;
    expect(
      await dryRunTransform({
        ...exampleArgs,
        transformedNames: identicalTransform,
      })
    ).toBe(false);
  });
  it("Should return false, if duplicated renames exist", async () => {
    [0, 1].forEach((num) =>
      spyOnNumberOfDuplicatedNames.mockReturnValueOnce(num)
    );
    expect(await dryRunTransform(exampleArgs)).toBe(false);
  });
  it("Should return false, if willOverwriteExisting returns true", async () => {
    spyOnWillOverwrite.mockReturnValueOnce(true);
    expect(await dryRunTransform(exampleArgs)).toBe(false);
  });
  it("Should return false, if askQuestion answer is not included in valid types", async () => {
    ["no", "NO", "nope", "something", "!!"].forEach(async (answer) => {
      spyOnAskQuestion.mockResolvedValueOnce(answer);
      expect(await dryRunTransform(exampleArgs)).toBe(false);
    });
  });
  it("Should return true, if askQuestion answer is of valid type", async () => {
    ["y", "yes", "Y", "YES", "yEs", "Yes", "YeS"].forEach(async (answer) => {
      spyOnAskQuestion.mockResolvedValueOnce(answer);
      expect(await dryRunTransform(exampleArgs)).toBe(true);
    });
  });
});
