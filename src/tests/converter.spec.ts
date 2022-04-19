import { writeFile } from "fs/promises";
import * as converter from "../converters/converter.js";
import * as dateTransformFunctions from "../converters/dateTransform.js";
import * as numericTransformFunctions from "../converters/numericTransform.js";
import * as searchAndReplaceTransformFunctions from "../converters/searchAndReplace.js";
import * as truncateTransformFunctions from "../converters/truncateTransform.js";
import * as utils from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import { TransformTypes } from "../types.js";
import { generateMockSplitFileList, renameListDistinct } from "./mocks.js";

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

const { convertFiles, dryRunTransform, generateRenameList } = converter;

const createSpyOnProcess = () =>
  jest.spyOn(process, "exit").mockImplementation((code?: number) => {
    throw new Error(code?.toString());
  });
const createSpyOnLog = () =>
  jest.spyOn(console, "log").mockImplementation((message?: string) => {});
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
  spyOnCreateBatchRename = jest.spyOn(utils, "createBatchRenameList"),
  sypOnDetermineDir = jest.spyOn(utils, "determineDir"),
  spyOnAreNewNamesDisticnt = jest.spyOn(utils, "areNewNamesDistinct"),
  spyOnListFiles = jest.spyOn(utils, "listFiles"),
  spyOnExtractBaseAndExt = jest.spyOn(utils, "extractBaseAndExt"),
  spyOnProvideFileStats = jest.spyOn(
    dateTransformFunctions,
    "provideFileStats"
  );

[
  spyOnDateTransform,
  spyOnSearchAndReplace,
  spyOnNumericTransform,
  spyOnTruncateTransform,
].forEach((transformOperation) =>
  transformOperation.mockImplementation((args) => renameListDistinct)
);

const splitFileList = generateMockSplitFileList(10);

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
