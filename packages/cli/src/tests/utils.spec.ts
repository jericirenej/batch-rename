import { parseBoolOption, parseRestoreArg } from "../utils.js";

describe("parseBoolOption", () => {
  it("Should return default value, if arg is falsy or would throw error", () => {
    [undefined, null, 12345, "truthy", "falsy"].forEach((option) => {
      [false, true].forEach((defaultArg) => {
        expect(parseBoolOption(option, defaultArg)).toBe(defaultArg);
      });
    });
  });
  it("Should pass the parsed string boolean", () => {
    ["true", "false"].forEach((option) => {
      [false, true].forEach((defaultArg) => {
        expect(parseBoolOption(option, defaultArg)).toBe(JSON.parse(option));
      });
    });
  });
});

describe("parseRestoreArg", () => {
  it("Should return an integer for stringified number values", () => {
    for (const [arg, expected] of [
      ["1", 1],
      ["2", 2],
      ["-1", 1],
      ["2.15", 2],
    ]) {
      expect(parseRestoreArg(arg)).toBe(expected);
    }
  });
  it("True and false should be converted to 0", () => {
    [true, false].forEach((arg) => expect(parseRestoreArg(arg)).toBe(0));
  });
  it("Undefined, null, etc. should convert to 0", () => {
    [null, NaN, undefined].forEach((arg) => expect(parseRestoreArg(arg)).toBe(0));
  });
  it("Exception should return 0", () => {
    // eslint-disable-next-line symbol-description
    expect(parseRestoreArg(Symbol())).toBe(0);
  });
});