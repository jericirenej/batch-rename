import {
  baseReplacer,
  keepTransform,
  omitTransform
} from "../converters/keepOrOmit.js";
import type {
  BaseRenameList,
  ExtractBaseAndExtReturn,
  KeepTransformArgs,
  OmitTransformArgs
} from "../types.js";
import * as utils from "../utils/utils.js";
import { examplePath, mockKeepList as splitFileList } from "./mocks.js";

const { jsonReplicate } = utils;

describe("baseReplacer", () => {
  it("Will apply matcher as an empty replacer", () => {
    const matchers = ["Part", /Part/gu];
    const results = matchers.map((matcher) =>
      baseReplacer({ splitFileList, matcher })
    );
    const expected: BaseRenameList = splitFileList.map(({ baseName, ext }) => ({
      original: `${baseName}${ext}`,
      rename: `${baseName.replaceAll("Part", "")}${ext}`,
    }));
    results.forEach((result) => expect(result).toEqual(expected));
  });
  it("Will call composeRenameString", () => {
    const spyOnCompose = jest.spyOn(utils, "composeRenameString");
    baseReplacer({
      matcher: "noMatcher",
      splitFileList: [splitFileList[0]],
    });
    expect(spyOnCompose).toHaveBeenCalledTimes(1);
  });
  it("Will only return non-identical transforms", () => {
    const keep = `Part(\\d{3})`;
    const splitListWithIdenticalTransform: ExtractBaseAndExtReturn = [
      ...jsonReplicate(splitFileList),
      {
        baseName: "Part005",
        ext: "ext",
        sourcePath: examplePath,
        type: "file",
      },
    ];
    const args: KeepTransformArgs = {
      splitFileList: splitListWithIdenticalTransform,
      keep,
    };
    const result = keepTransform(args);
    expect(result.length).toBe(splitFileList.length);
  });
});

describe("keepTransform and omitTransform", () => {
  const keep = `Part(\\d{3})`;
  const omit = `Part`;
  const customText = "custom";
  const baseKeepArgs: KeepTransformArgs = { splitFileList, keep };
  const baseOmitArgs: OmitTransformArgs = { splitFileList, omit };
  const baseExpect = splitFileList.map(({ baseName, ext }) => ({
    original: `${baseName}${ext}`,
  }));
  0;
  afterEach(() => jest.clearAllMocks());
  it("With undefined 'keep' or 'omit' arg, should return empty array", () => {
    (
      [
        [keepTransform, "keep"],
        [omitTransform, "omit"],
      ] as const
    ).forEach(([transform, prop]) =>
      expect(transform({ ...baseKeepArgs, [prop]: undefined })).toEqual([])
    );
  });
  it("Keep: With only 'keep' arg, return should contain only matched string with extension", () => {
    const expected: BaseRenameList = splitFileList.map(({ ext }, index) => ({
      rename: `Part00${index + 1}${ext}`,
      ...baseExpect[index],
    }));
    expect(keepTransform(baseKeepArgs)).toEqual(expected);
  });
  it("Omit: With only 'omit' arg, should contain string with extension, without matchedParts", () => {
    const expected: BaseRenameList = splitFileList.map(
      ({ baseName, ext }, index) => ({
        rename: `${baseName.replaceAll(omit, "")}${ext}`,
        ...baseExpect[index],
      })
    );
    expect(omitTransform(baseOmitArgs)).toEqual(expected);
  });
  it("Keep: Should return expected transforms", () => {
    const testCases: { args: KeepTransformArgs; expected: BaseRenameList }[] = [
      {
        args: { ...baseKeepArgs, format: "uppercase" },
        expected: splitFileList.map(({ ext }, index) => ({
          ...baseExpect[index],
          rename: `PART00${index + 1}${ext}`,
        })),
      },
      {
        args: {
          ...baseKeepArgs,
          noExtensionPreserve: true,
          format: "lowercase",
        },
        expected: splitFileList.map((_, index) => ({
          ...baseExpect[index],
          rename: `part00${index + 1}`,
        })),
      },
      {
        args: {
          ...baseKeepArgs,
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
  it("Omit: Should return expected transforms", () => {
    const testCases: { args: OmitTransformArgs; expected: BaseRenameList }[] = [
      {
        args: { ...baseOmitArgs, format: "uppercase" },
        expected: splitFileList.map(({ ext, baseName }, index) => ({
          ...baseExpect[index],
          rename: `${baseName.replaceAll(omit, "").toUpperCase()}${ext}`,
        })),
      },
      {
        args: {
          ...baseOmitArgs,
          noExtensionPreserve: true,
          format: "lowercase",
        },
        expected: splitFileList.map(({ baseName, ext }, index) => ({
          ...baseExpect[index],
          rename: `${baseName.replaceAll(omit, "").toLocaleLowerCase()}${ext}`,
        })),
      },
      {
        args: {
          ...baseOmitArgs,
          separator: "_",
          addText: customText,
          textPosition: "append",
        },
        expected: splitFileList.map(({ baseName, ext }, index) => ({
          ...baseExpect[index],
          rename: `${baseName.replaceAll(omit, "")}_${customText}${ext}`,
        })),
      },
    ];
    for (const { args, expected } of testCases) {
      expect(omitTransform(args)).toEqual(expected);
    }
  });
});
