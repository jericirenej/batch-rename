import { keepTransform } from "../converters/keepTransform.js";
import type { KeepTransformArgs, LegacyRenameList } from "../types.js";
import { mockKeepList as splitFileList } from "./mocks.js";

describe("keepTransform", () => {
  const keep = `Part(\\d{3})`;
  const customText = "custom";
  const baseArgs: KeepTransformArgs = { splitFileList, keep };
  const baseExpect = splitFileList.map(({ baseName, ext, sourcePath }) => ({
    original: `${baseName}${ext}`,
    sourcePath,
  }));
  afterEach(() => jest.clearAllMocks());
  it("With only 'keep' arg, return should contain only matched string with extension", () => {
    const expected: LegacyRenameList = splitFileList.map(({ ext }, index) => ({
      rename: `Part00${index + 1}${ext}`,
      ...baseExpect[index],
    }));
    expect(keepTransform(baseArgs)).toEqual(expected);
  });
  it("Will perform specified transforms on target files", () => {
    const testCases: { args: KeepTransformArgs; expected: LegacyRenameList }[] = [
      {
        args: { ...baseArgs, format: "uppercase" },
        expected: splitFileList.map(({ ext }, index) => ({
          ...baseExpect[index],
          rename: `PART00${index + 1}${ext}`,
        })),
      },
      {
        args: { ...baseArgs, noExtensionPreserve: true, format: "lowercase" },
        expected: splitFileList.map((_, index) => ({
          ...baseExpect[index],
          rename: `part00${index + 1}`,
        })),
      },
      {
        args: {
          ...baseArgs,
          separator: "_",
          addText: customText,
          textPosition: "append",
        },
        expected: splitFileList.map(({ ext }, index) => ({
          ...baseExpect[index],
          rename: `Part00${index + 1}_${customText}${ext}`,
        })),
      },
    ];
    for (const { args, expected } of testCases) {
      expect(keepTransform(args)).toEqual(expected);
    }
  });
});
