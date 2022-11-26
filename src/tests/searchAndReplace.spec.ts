import { EXT_REGEX } from "../constants.js";
import * as formatText from "../converters/formatTextTransform.js";
import * as regexTransform from "../converters/searchAndReplace.js";
import { BaseRenameItem, GenerateRenameListArgs } from "../types.js";
import * as utils from "../utils/utils.js";
import {
  generateMockSplitFileList,
  mockDirentEntryAsFile,
  mockSplitFile
} from "./mocks.js";

const { extractBaseAndExt } = utils;

const { generateSearchAndReplaceArgs, optionalTruncate, searchAndReplace } =
  regexTransform;
const spyOnGenerateArguments = jest.spyOn(
    regexTransform,
    "generateSearchAndReplaceArgs"
  ),
  spyOnOptionalTruncate = jest.spyOn(regexTransform, "optionalTruncate"),
  spyOnExtractBaseAndExt = jest.spyOn(utils, "extractBaseAndExt"),
  spyOnTruncateFile = jest.spyOn(utils, "truncateFile");

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

describe("optionalTruncate", () => {
  const truncate = "5",
    modifiedName = "modifiedName.ext",
    modifiedNameType = "file" as const,
    modifiedNameDirent = [{ name: modifiedName, ...mockDirentEntryAsFile }],
    sourcePath = "sourcePath";
  afterEach(() => jest.clearAllMocks());
  it("should call extractBaseAndExt", () => {
    optionalTruncate(truncate, modifiedName, sourcePath, modifiedNameType);
    expect(spyOnExtractBaseAndExt).toHaveBeenCalledTimes(1);
  });
  it("Should call truncateFile", () => {
    optionalTruncate(truncate, modifiedName, sourcePath, modifiedNameType);
    const { baseName } = extractBaseAndExt(modifiedNameDirent, sourcePath)[0];
    expect(spyOnTruncateFile).toHaveBeenCalledTimes(1);
    expect(spyOnTruncateFile).toHaveBeenCalledWith({
      baseName,
      preserveOriginal: true,
      truncate,
    });
  });
  it("Should return appropriate response", () => {
    const response = optionalTruncate(
      truncate,
      modifiedName,
      sourcePath,
      modifiedNameType
    );
    const expected = `${modifiedName.slice(0, Number(truncate))}.ext`;
    expect(response).toBe(expected);
  });
});

describe("searchAndReplace", () => {
  const exampleArgs: GenerateRenameListArgs = {
    splitFileList: generateMockSplitFileList(2),
    searchAndReplace: ["baseName", "newName"],
    truncate: undefined,
    transformPattern: ["searchAndReplace"],
  };
  afterEach(() => jest.clearAllMocks());
  it("Should return a properly shaped response", () => {
    const response = searchAndReplace(exampleArgs);
    expect(Array.isArray(response)).toBe(true);
    response.forEach((entry) => {
      const keys = Object.keys(entry) as (keyof typeof entry)[];
      const expected: (keyof BaseRenameItem)[] = ["original", "rename"];
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
    const newArgs: GenerateRenameListArgs = {
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
    const newArgs: GenerateRenameListArgs = {
      ...exampleArgs,
      searchAndReplace: ["ext", "int"],
      splitFileList: customMocksList,
    };
    const noExtension: GenerateRenameListArgs = {
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
    const newArgs: GenerateRenameListArgs = {
      ...exampleArgs,
      splitFileList: customMocksList,
      searchAndReplace: ["match", "replace"],
    };
    const response = searchAndReplace(newArgs);
    expect(response.length).toBe(1);
    expect(response[0].rename).toContain("replace");
  });
  it("Should not call optionalTruncate, if truncate argument is falsy", () => {
    searchAndReplace(exampleArgs);
    expect(spyOnOptionalTruncate).not.toHaveBeenCalled();
  });
  it("Should call optionalTruncate with appropriate arguments, if truncate argument is supplied", () => {
    const customMocksList = generateMockSplitFileList(2);
    customMocksList.forEach((entry) => (entry.baseName = "match"));
    const newArgs: GenerateRenameListArgs = {
      ...exampleArgs,
      splitFileList: customMocksList,
      searchAndReplace: ["match", "replace"],
      truncate: "5",
    };
    searchAndReplace(newArgs);
    expect(spyOnOptionalTruncate).toHaveBeenCalledTimes(
      exampleArgs.splitFileList.length
    );
    spyOnOptionalTruncate.mock.calls.forEach((callArgs, index) => {
      const [rename, sourcePath] = [
        `replace${customMocksList[index].ext}`,
        customMocksList[index].sourcePath,
      ];
      expect(callArgs).toEqual([
        newArgs.truncate,
        rename,
        sourcePath,
        mockSplitFile.type,
      ]);
    });
  });
  it("Should not call optionalTruncate for un-transformed elements", () => {
    const customMocksList = generateMockSplitFileList(2);
    customMocksList[0].baseName = "match";
    customMocksList[1].baseName = "other";
    const newArgs: GenerateRenameListArgs = {
      ...exampleArgs,
      splitFileList: customMocksList,
      searchAndReplace: ["match", "replace"],
      truncate: "5",
    };
    searchAndReplace(newArgs);
    expect(spyOnOptionalTruncate).toHaveBeenCalledTimes(1);
  });
  it("Should call formatFile, if format argument passed", () => {
    const spyOnFormatFile = jest.spyOn(formatText, "formatFile");
    const argsWithFormat: GenerateRenameListArgs = {
      ...exampleArgs,
      format: "uppercase",
    };
    [exampleArgs, argsWithFormat].forEach((args) => searchAndReplace(args));
    expect(spyOnFormatFile).toHaveBeenCalledTimes(
      exampleArgs.splitFileList.length
    );
  });
});
