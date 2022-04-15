import {
  checkBaseIndex,
  generateSequenceNumber,
} from "../converters/numericTransform.js";

describe("checkBaseIndex", () => {
  it("Should return null, if provided argument is undefined or zero length", () => {
    [undefined, ""].forEach((arg) => expect(checkBaseIndex(arg)).toBeNull());
  });
  it("Should return null if provided argument cannot be evaluated to number", () => {
    expect(checkBaseIndex("invalid")).toBeNull();
  });
  it("Should return null, if baseIndex is negative", () => {
    ["-1", "-10", "-10000"].forEach((arg) =>
      expect(checkBaseIndex(arg)).toBeNull()
    );
  });
  it("Should return floored integer, if arg can be converted to it", () => {
    [
      { arg: "0", expected: 0 },
      { arg: "1", expected: 1 },
      { arg: "1500", expected: 1500 },
      { arg: "1.34", expected: 1 },
    ].forEach((argInstance) => {
      const { arg, expected } = argInstance;
      expect(checkBaseIndex(arg)).toBe(expected);
    });
  });
});

describe("generateSequenceNumber", () => {
  it("Should return proper odd transform", () => {
    const args = [0, 1, 2, 3, 4, 5];
    const expected = [1, 3, 5, 7, 9, 11];
    args.forEach((arg, index) =>
      expect(generateSequenceNumber("odd", arg, null)).toBe(expected[index])
    );
  });
  it("Should return proper even transform", () => {
    const args = [0, 1, 2, 3, 4, 5];
    const expected = [2, 4, 6, 8, 10, 12];
    args.forEach((arg, index) =>
      expect(generateSequenceNumber("even", arg, null)).toBe(expected[index])
    );
  });
  it("Should increment sequenceNumber by one, if baseIndex is null", () => {
    const args = [0, 1, 2, 3, 4, 5];
    args.forEach((arg, index) =>
      expect(generateSequenceNumber("sequence", arg, null)).toBe(
        args[index] + 1
      )
    );
  });
  it("Should return sequenceNumber, if baseIndex is not null", () => {
    const args = [0, 1, 2, 3, 4, 5];
    args.forEach((arg, index) =>
      expect(generateSequenceNumber("sequence", arg, 12345)).toBe(args[index])
    );
  });
});
