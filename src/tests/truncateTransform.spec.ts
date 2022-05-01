import { DEFAULT_SEPARATOR } from "../constants.js";
import { truncateTransform } from "../converters/truncateTransform.js";
import { composeRenameString } from "../converters/utils.js";
import { ERRORS } from "../messages/errMessages.js";
import type { GenerateRenameListArgs, RenameList } from "../types.js";
import { generateMockSplitFileList } from "./mocks.js";

jest.mock("../converters/utils.js", () => {
  const originalModule = jest.requireActual("../converters/utils.js");
  return {
    __esModule: true,
    ...originalModule,
    composeRenameString: jest.fn(),
  };
});
const splitFileList = generateMockSplitFileList(10);
const mockComposeResponse = "renameArg";
const mockedCompose = jest.mocked(composeRenameString);

const defaultArgs: GenerateRenameListArgs = {
  splitFileList,
  transformPattern: ["truncate"],
  preserveOriginal: true,
  addText: "addText",
  separator: DEFAULT_SEPARATOR,
  textPosition: undefined,
  truncate: "3",
};
describe("truncateTransform", () => {
  beforeEach(() =>
    mockedCompose.mockImplementation((args) => mockComposeResponse)
  );
  afterEach(() => jest.resetAllMocks());
  it("Should throw error if preserveOriginal is true", () => {
    expect(() =>
      truncateTransform({ ...defaultArgs, preserveOriginal: false })
    ).toThrowError(ERRORS.TRUNCATE_NO_PRESERVE_ORIGINAL);
  });
  it("Should throw error, if truncate truncate can't be evaluated to a number", () => {
    expect(() =>
      truncateTransform({ ...defaultArgs, truncate: "invalid" })
    ).toThrowError(ERRORS.TRUNCATE_INVALID_ARGUMENT);
  });
  it("Should call composeRename function for each splitFile entry", () => {
    truncateTransform(defaultArgs);
    expect(mockedCompose).toHaveBeenCalledTimes(splitFileList.length);
  });
  it("Should set preserveOriginal argument to false in each composeRenameString call", () => {
    truncateTransform(defaultArgs);
    const preserveArgs = mockedCompose.mock.calls.map(
      (call) => call[0].preserveOriginal
    );
    const allFalse = preserveArgs.every((preserveArg) => !preserveArg);
    expect(allFalse).toBe(true);
  });
  it("Should pass appropriately truncated baseName to composeRenameString", () => {
    [3, 2, 1, -1, -2, -3].forEach((truncate) => {
      mockedCompose.mockClear();
      const expected = splitFileList
        .map((fileInfo) => fileInfo.baseName)
        .map((baseName) => baseName.slice(0, truncate));
      truncateTransform({ ...defaultArgs, truncate: truncate.toString() });
      const slicedBaseNames = mockedCompose.mock.calls.map(
        (call) => call[0].newName
      );
      expect(slicedBaseNames).toEqual(expected);
    });
  });
  it("Should pass original baseName to composeRenameString, if truncate evaluates to 0", () => {
    const expected = splitFileList.map((fileInfo) => fileInfo.baseName);
    ["", "0"].forEach((truncate) => {
      mockedCompose.mockClear();
      truncateTransform({ ...defaultArgs, truncate });
      const slicedBaseNames = mockedCompose.mock.calls.map(
        (call) => call[0].newName
      );
      expect(slicedBaseNames).toEqual(expected);
    });
  });
  it("Should return proper response", () => {
    const expected: RenameList = splitFileList.map((fileInfo) => {
      const { baseName, ext, sourcePath } = fileInfo;
      return {
        rename: mockComposeResponse,
        original: `${baseName}${ext}`,
        sourcePath,
      };
    });
    expect(truncateTransform(defaultArgs)).toEqual(expected);
  });
});
