import { DEFAULT_SEPARATOR } from "../constants.js";
import * as numericConverter from "../converters/numericTransform.js";
import * as utils from "../converters/utils.js";
import type { GenerateRenameListArgs } from "../types.js";
import { generateMockSplitFileList } from "./mocks.js";

const { numericTransform, checkBaseIndex } = numericConverter;

const spyOnCheckBaseIndex = jest.spyOn(numericConverter, "checkBaseIndex"),
  spyOnGenerateSequenceNumber = jest.spyOn(
    numericConverter,
    "generateSequenceNumber"
  ),
  spyOnGeneratePaddedNumber = jest.spyOn(
    numericConverter,
    "generatePaddedNumber"
  ),
  spyOnComposeRenameString = jest.spyOn(utils, "composeRenameString");

// Replicate methods from original function. Presupposes that
// checkBaseIndex is working properly.
const determineBase = (base: string | undefined): number => {
  const baseIndex = checkBaseIndex(base);
  if (baseIndex) {
    return (baseIndex + splitFileList.length).toString().length;
  }
  return splitFileList.length.toString().length;
};
const exampleBaseIndices = [undefined, "1", "10", "120", "1000"];
const mockComposeResponse = "renameArg";

const splitFileList = generateMockSplitFileList(10);

const defaultArgs: GenerateRenameListArgs = {
  splitFileList,
  customText: "customText",
  textPosition: undefined,
  preserveOriginal: true,
  numericTransform: "sequence",
  separator: DEFAULT_SEPARATOR,
  truncate: "3",
  baseIndex: "1",
  transformPattern: ["numericTransform"],
};

describe("numericTransform", () => {
  afterEach(() => jest.clearAllMocks());
  it("Should call checkBaseIndex, generateSequenceNumber, and generatePaddedNumber helpers", () => {
    numericTransform(defaultArgs);
    expect(spyOnCheckBaseIndex).toHaveBeenCalledTimes(1);
  });
  it("Should call generateSequenceNumber and generatePaddedNumber for each entry", () => {
    const expected = splitFileList.length;
    numericTransform(defaultArgs);
    expect(spyOnGenerateSequenceNumber).toHaveBeenCalledTimes(expected);
    expect(spyOnGeneratePaddedNumber).toHaveBeenCalledTimes(expected);
  });
  it("Should call composeRenameString for each entry", () => {
    const expected = splitFileList.length;
    numericTransform(defaultArgs);
    expect(spyOnComposeRenameString).toHaveBeenCalledTimes(expected);
  });
  it("Should calculate proper listLength, taking into account the baseIndex value", () => {
    exampleBaseIndices.forEach((baseIndex) => {
      spyOnGeneratePaddedNumber.mockClear();
      const expected = determineBase(baseIndex);
      numericTransform({ ...defaultArgs, baseIndex });
      const areAllCalledWithExpected =
        spyOnGeneratePaddedNumber.mock.calls.every(
          (call) => call[1] === expected
        );
      expect(areAllCalledWithExpected).toBe(true);
    });
  });
  it("Should calculate proper indexWithBase, taking into account the baseIndex value", () => {
    exampleBaseIndices.forEach((baseIndex) => {
      spyOnGenerateSequenceNumber.mockClear();
      const numberedBase = checkBaseIndex(baseIndex);
      numericTransform({ ...defaultArgs, baseIndex });
      const areAllCalledWithExpected =
        spyOnGenerateSequenceNumber.mock.calls.every((call, index) => {
          const expected = numberedBase !== null ? index + numberedBase : index;
          return call[1] === expected;
        });
      expect(areAllCalledWithExpected).toBe(true);
    });
  });
  it("Should return proper object", () => {
    spyOnComposeRenameString.mockReturnValue(mockComposeResponse);
    const transformReturn = numericTransform(defaultArgs);
    transformReturn.map((transformation, index) => {
      const keys = Object.keys(transformation);
      const expected = ["rename", "original", "sourcePath"];
      expect(keys).toEqual(expected);
      const { baseName, ext, sourcePath } = splitFileList[index];
      expect(transformation.original).toEqual(`${baseName}${ext}`);
      expect(transformation.rename).toEqual(mockComposeResponse);
      expect(transformation.sourcePath).toEqual(sourcePath);
    });
  });
});
