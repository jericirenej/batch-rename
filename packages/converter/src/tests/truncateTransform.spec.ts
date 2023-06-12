import type { BaseRenameList, GenerateRenameListArgs } from "@batch-rename/lib";
import { DEFAULT_SEPARATOR, ERRORS } from "@batch-rename/lib";
import * as formatText from "../converters/formatTextTransform.js";
import { truncateTransform } from "../converters/truncateTransform.js";
import * as utils from "../utils/utils.js";
import { generateMockSplitFileList } from "./mocks.js";

const spyOnCompose = jest.spyOn(utils, "composeRenameString");
const splitFileList = generateMockSplitFileList(10);
const mockComposeResponse = "renameArg";

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
    spyOnCompose.mockImplementation((args) => mockComposeResponse)
  );
  afterEach(() => jest.clearAllMocks());
  it("Should throw error if preserveOriginal is true", () => {
    expect(() =>
      truncateTransform({ ...defaultArgs, preserveOriginal: false })
    ).toThrowError(ERRORS.transforms.truncateNoPreserveOriginal);
  });
  it("Should throw error, if truncate truncate can't be evaluated to a number", () => {
    expect(() =>
      truncateTransform({ ...defaultArgs, truncate: "invalid" })
    ).toThrowError(ERRORS.transforms.truncateInvalidArgument);
  });
  it("Should call composeRename function for each splitFile entry", () => {
    truncateTransform(defaultArgs);
    expect(spyOnCompose).toHaveBeenCalledTimes(splitFileList.length);
  });
  it("Should set preserveOriginal argument to false in each composeRenameString call", () => {
    truncateTransform(defaultArgs);
    const preserveArgs = spyOnCompose.mock.calls.map(
      (call) => call[0].preserveOriginal
    );
    const allFalse = preserveArgs.every((preserveArg) => !preserveArg);
    expect(allFalse).toBe(true);
  });
  it("Should pass appropriately truncated baseName to composeRenameString", () => {
    [3, 2, 1, -1, -2, -3].forEach((truncate) => {
      spyOnCompose.mockClear();
      const expected = splitFileList
        .map((fileInfo) => fileInfo.baseName)
        .map((baseName) => baseName.slice(0, truncate));
      truncateTransform({ ...defaultArgs, truncate: truncate.toString() });
      const slicedBaseNames = spyOnCompose.mock.calls.map(
        (call) => call[0].newName
      );
      expect(slicedBaseNames).toEqual(expected);
    });
  });
  it("Should pass original baseName to composeRenameString, if truncate evaluates to 0", () => {
    const expected = splitFileList.map((fileInfo) => fileInfo.baseName);
    ["", "0"].forEach((truncate) => {
      spyOnCompose.mockClear();
      truncateTransform({ ...defaultArgs, truncate });
      const slicedBaseNames = spyOnCompose.mock.calls.map(
        (call) => call[0].newName
      );
      expect(slicedBaseNames).toEqual(expected);
    });
  });
  it("Should return proper response", () => {
    const expected: BaseRenameList = splitFileList.map((fileInfo) => {
      const { baseName, ext } = fileInfo;
      return {
        rename: mockComposeResponse,
        original: `${baseName}${ext}`,
      };
    });
    expect(truncateTransform(defaultArgs)).toEqual(expected);
  });
  it("Should call formatFile (via composeRenameString), if format argument passed", () => {
    spyOnCompose.mockRestore();
    const spyOnFormatFile = jest.spyOn(formatText, "formatFile");
    const argsWithFormat: GenerateRenameListArgs = {
      ...defaultArgs,
      format: "uppercase",
    };
    [defaultArgs, argsWithFormat].forEach((args) => truncateTransform(args));
    expect(spyOnFormatFile).toHaveBeenCalledTimes(
      defaultArgs.splitFileList.length
    );
  });
});
