import * as regexTransform from "../converters/searchAndReplace.js";
import * as utils from "../converters/utils.js";

const { extractBaseAndExt, truncateFile } = utils;

const { generateArguments, optionalTruncate, searchAndReplace } =
  regexTransform;
const spyOnGenerateArguments = jest.spyOn(regexTransform, "generateArguments"),
  spyOnOptionalTruncate = jest.spyOn(regexTransform, "optionalTruncate"),
  spyOnExtractBaseAndExt = jest.spyOn(utils, "extractBaseAndExt"),
  spyOnTruncateFile = jest.spyOn(utils, "truncateFile");

describe("generateArguments", () => {
  const exampleArgs = ["filter", "replace"];
  it("Should return proper shape of object", () => {
    const replaceConfig = generateArguments(exampleArgs);
    Object.entries(replaceConfig).forEach((entry, index) => {
      const [key, value] = [entry[0], entry[1]];
      expect(key).toBe(exampleArgs[index]);
      index === 0
        ? expect(value instanceof RegExp).toBe(true)
        : expect(typeof value).toBe("string");
    });
  });
  it("Filter should be null, if only one argument is supplied", () => {
    const replaceConfig = generateArguments([exampleArgs[0]]);
    expect(replaceConfig.filter).toBeNull();
  });
  it("Filter should include passed string", () => {
    const replaceConfig = generateArguments(exampleArgs);
    expect(replaceConfig.filter!.source).toBe(exampleArgs[0]);
  });
  it("Filter should have only global flag set", () => {
    const replaceConfig = generateArguments(exampleArgs);
    expect(replaceConfig.filter!.flags).toBe("g");
  });
});

describe("optionalTruncate", () => {
  const truncate = "5",
    modifiedName = "modifiedName.ext",
    sourcePath = "sourcePath";
  afterEach(() => jest.clearAllMocks());
  it("should call extractBaseAndExt", () => {
    optionalTruncate(truncate, modifiedName, sourcePath);
    expect(spyOnExtractBaseAndExt).toHaveBeenCalledTimes(1);
    expect(spyOnExtractBaseAndExt).toHaveBeenCalledWith(
      [modifiedName],
      sourcePath
    );
  });
  it("Should call truncateFile", () => {
    optionalTruncate(truncate, modifiedName, sourcePath);
    const { baseName } = extractBaseAndExt([modifiedName], sourcePath)[0];
    expect(spyOnTruncateFile).toHaveBeenCalledTimes(1);
    expect(spyOnTruncateFile).toHaveBeenCalledWith({
      baseName,
      preserveOriginal: true,
      truncate,
    });
  });
  it("Should return appropriate response", () => {
    const response = optionalTruncate(truncate, modifiedName, sourcePath);
    const expected = `${modifiedName.slice(0, Number(truncate))}.ext`;
    expect(response).toBe(expected);
  });
});
