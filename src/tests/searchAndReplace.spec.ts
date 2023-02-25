import { EXT_REGEX } from "../constants.js";
import * as regexTransform from "../converters/searchAndReplace.js";
import {
  BaseRenameItem, ExtractBaseAndExtReturn, SearchAndReplaceArgs
} from "../types.js";
import {
  examplePath,
  generateMockSplitFileList
} from "./mocks.js";

const { generateSearchAndReplaceArgs, searchAndReplace } = regexTransform;
const spyOnGenerateArguments = jest.spyOn(
  regexTransform,
  "generateSearchAndReplaceArgs"
);

describe("generateSearchAndReplaceArgs", () => {
  const exampleArgs = ["filter", "replace"];
  it("Should return proper shape of object", () => {
    const replaceConfig = generateSearchAndReplaceArgs(exampleArgs);
    Object.entries(replaceConfig).forEach((entry, index) => {
      const [key, value] = [entry[0], entry[1]];
      expect(key).toBe(exampleArgs[index]);
      index === 0
        ? expect(value instanceof RegExp).toBe(true)
        : expect(typeof value).toBe("string");
    });
  });
  it("Filter should be null, if only one argument is supplied", () => {
    const replaceConfig = generateSearchAndReplaceArgs([exampleArgs[0]]);
    expect(replaceConfig.filter).toBeNull();
  });
  it("Filter should include passed string", () => {
    const replaceConfig = generateSearchAndReplaceArgs(exampleArgs);
    expect(replaceConfig.filter!.source).toBe(exampleArgs[0]);
  });
  it("Filter should have only global flag set", () => {
    const replaceConfig = generateSearchAndReplaceArgs(exampleArgs);
    expect(replaceConfig.filter!.flags).toBe("gu");
  });
});

describe("searchAndReplace", () => {
  const exampleArgs: SearchAndReplaceArgs = {
    splitFileList: generateMockSplitFileList(2),
    searchAndReplace: ["baseName", "newName"],
    truncate: undefined,
  };
  afterEach(() => jest.clearAllMocks());
  it("Should return a properly shaped response", () => {
    const response = searchAndReplace(exampleArgs);
    expect(Array.isArray(response)).toBe(true);
    response.forEach((entry) => {
      const keys = Object.keys(entry) as (keyof typeof entry)[];
      const expected: (keyof BaseRenameItem)[] = ["rename", "original"];
      expect(keys).toEqual(expected);
      keys.forEach((key) => expect(typeof entry[key]).toBe("string"));
    });
  });
  it("Should call generateArguments", () => {
    searchAndReplace(exampleArgs);
    expect(spyOnGenerateArguments).toHaveBeenCalledTimes(1);
    expect(spyOnGenerateArguments).toHaveBeenCalledWith(
      exampleArgs.searchAndReplace
    );
  });
  it("Should replace text in provided file list", () => {
    const response = searchAndReplace(exampleArgs);
    const expectedExt = exampleArgs.splitFileList[0].ext;
    response.forEach((entry, index) => {
      expect(entry.rename).toBe(`newName${index + 1}${expectedExt}`);
    });
  });
  it("Should replace all matches of a regex supplied filter in target file", () => {
    const customMocksList = generateMockSplitFileList(2);
    customMocksList[0].baseName = "extra-extra";
    // Remove all 'ext' characters, except if preceded by string.
    const filter = "(?<!\\.)ext";
    const newArgs: SearchAndReplaceArgs = {
      ...exampleArgs,
      searchAndReplace: [filter, "ult"],
      splitFileList: customMocksList,
    };
    const response = searchAndReplace(newArgs);
    expect(response[0].rename).toBe("ultra-ultra.ext");
  });
  it("Should preserve extension, except if noPreserveExtension is specified", () => {
    const customMocksList = generateMockSplitFileList(2).map(
      (fileInfo, index) => ({ ...fileInfo, baseName: `exterior${index + 1}` })
    );
    const newArgs: SearchAndReplaceArgs = {
      ...exampleArgs,
      searchAndReplace: ["ext", "int"],
      splitFileList: customMocksList,
    };
    const noExtension: SearchAndReplaceArgs = {
      ...newArgs,
      noExtensionPreserve: true,
    };
    const [extensionPreserve, noExtensionPreserve] = [
      searchAndReplace(newArgs),
      searchAndReplace(noExtension),
    ];
    extensionPreserve.forEach((renamedFile, index) => {
      const { rename } = renamedFile;
      const extIndex = rename.search(EXT_REGEX);
      const [baseName, ext] = [
        rename.slice(0, extIndex),
        rename.slice(extIndex),
      ];
      expect(ext).toBe(".ext");
      expect(baseName).toBe(`interior${index + 1}`);
    });
    noExtensionPreserve.forEach((renamedFile, index) => {
      const { rename } = renamedFile;
      expect(rename).toBe(`interior${index + 1}.int`);
    });
  });
  it("Should return empty list if filter is empty, even if other transforms are specified", () => {
    spyOnGenerateArguments.mockReturnValueOnce({
      filter: null,
      replace: "something",
    });
    const response = searchAndReplace({
      ...exampleArgs,
      truncate: "3",
      format: "capitalize",
    });
    expect(response.length).toBe(0);
  });
  it("Should not return entry, if filter doesn't match", () => {
    const customMocksList = generateMockSplitFileList(2);
    customMocksList[0].baseName = "match";
    customMocksList[1].baseName = "other";
    const newArgs: SearchAndReplaceArgs = {
      ...exampleArgs,
      splitFileList: customMocksList,
      searchAndReplace: ["match", "replace"],
    };
    const response = searchAndReplace(newArgs);
    expect(response.length).toBe(1);
    expect(response[0].rename).toContain("replace");
  });
  it("Only return non-identical transforms", () => {
    // eslint-disable-next-line no-useless-escape
    const filter = "(?<=Part-).+";
    const ext = ".ext";
    const fileList: ExtractBaseAndExtReturn = [
      { baseName: "Part-001", ext },
      { baseName: "Part-002", ext },
      { baseName: "Part-003", ext },
      { baseName: "Other-001", ext },
    ].map((fileInfo) => ({ ...fileInfo, sourcePath: examplePath, type: "file" }));
    const args: SearchAndReplaceArgs = {
      splitFileList: fileList,
      searchAndReplace: [filter, "001"],
    };
    const result = searchAndReplace(args);
    expect(result.length).toBe(2);
  });
});
