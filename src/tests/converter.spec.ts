import { writeFile } from "fs/promises";
import * as addConverter from "../converters/addTextTransform.js";
import * as converter from "../converters/converter.js";
import * as dateTransformFunctions from "../converters/dateTransform.js";
import * as numericTransformFunctions from "../converters/numericTransform.js";
import * as searchAndReplaceTransformFunctions from "../converters/searchAndReplace.js";
import * as truncateTransformFunctions from "../converters/truncateTransform.js";
import * as utils from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  DryRunTransformArgs,
  LegacyRenameList,
  RenameListArgs,
  TransformTypes
} from "../types.js";
import {
  examplePath,
  exampleStats,
  generateMockSplitFileList,
  mockFileList,
  renameListDistinct
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
const createSpyOnTable = () =>
  jest.spyOn(console, "table").mockImplementation((message?: string) => {});

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
  spyOnAskQuestion = jest.spyOn(utils, "askQuestion");

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
    spyOnGenerateRenameList.mockReturnValueOnce(renameListDistinct);
    await convertFiles(exampleArgs);
    expect(spyOnAreNewNamesDistinct).toHaveBeenCalledWith(renameListDistinct);
    expect(spyOnCreateBatchRename).toHaveBeenCalledWith(renameListDistinct);
  });
  it("Should throw error, if duplication of names occurs", async () => {
    spyOnAreNewNamesDistinct.mockReturnValueOnce(false);
    await expect(() => convertFiles(exampleArgs)).rejects.toThrowError(
      ERRORS.transforms.duplicateRenames
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

    const spyOnPromiseAllSettled = jest.spyOn(Promise, "allSettled");
    await convertFiles(exampleArgs);
    expect(spyOnPromiseAllSettled).toHaveBeenCalledTimes(1);
    expect(spyOnPromiseAllSettled).toHaveBeenCalledWith(mockBatchPromises);
    spyOnPromiseAllSettled.mockRestore();
  });
  it("Should call settledPromisesEval with appropriate arguments", async () => {
    const mockBatchPromises = [...renameListDistinct].map(() =>
      Promise.resolve()
    );
    spyOnGenerateRenameList.mockImplementationOnce(() => renameListDistinct);
    mockBatchPromises[0] = Promise.reject();
    spyOnCreateBatchRename.mockReturnValueOnce(mockBatchPromises);
    const promiseResults = await Promise.allSettled(mockBatchPromises);
    const spyOnSettledPromisesEval = jest.spyOn(utils, "settledPromisesEval");
    await convertFiles(exampleArgs);
    spyOnProcessWrite.mockRestore();
    spyOnConsole.mockRestore();
    expect(spyOnSettledPromisesEval).toHaveBeenCalledTimes(1);
    expect(spyOnSettledPromisesEval).toHaveBeenCalledWith({
      promiseResults,
      transformedNames: renameListDistinct,
      operationType: "convert",
    });
    expect(spyOnSettledPromisesEval).toHaveReturnedWith(
      renameListDistinct.slice(1)
    );
  });
  it("Should call console.log twice", async () => {
    await convertFiles(exampleArgs);
    expect(spyOnConsole).toHaveBeenCalledTimes(2);
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
  );
  let spyOnConsole: jest.SpyInstance, spyOnTable: jest.SpyInstance;
  const exampleArgs: DryRunTransformArgs = {
    transformPath: examplePath,
    transformPattern: ["searchAndReplace"],
    transformedNames: renameListDistinct,
  };
  beforeEach(() => {
    spyOnConsole = createSpyOnLog();
    spyOnTable = createSpyOnTable();
  });
  afterEach(() => {
    [spyOnConsole, spyOnTable].forEach((spy) => spy.mockRestore());
    spyOnNumberOfDuplicatedNames.mockReset();
  });
  it("Should call numberOfDuplicatedNames 2 times", async () => {
    spyOnAskQuestion.mockImplementationOnce((question) => Promise.resolve(""));
    spyOnNumberOfDuplicatedNames.mockReturnValue(0);
    await dryRunTransform(exampleArgs);
    expect(spyOnNumberOfDuplicatedNames).toHaveBeenCalledTimes(2);

    const checkTypeArgs = spyOnNumberOfDuplicatedNames.mock.calls
      .flat()
      .map((config) => config.checkType);
    const expectedArgs = ["transforms", "results"];
    expect(checkTypeArgs).toEqual(expectedArgs);
  });
  it("Should return false, if no names would be changed by transform", async () => {
    const identicalTransform: LegacyRenameList = [renameListDistinct[0]];
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
