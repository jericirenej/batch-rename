import {
  checkBaseIndex,
  generatePaddedNumber,
  generateSequenceNumber,
} from "../converters/numericTransform.js";

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

describe("generatePaddedNumber", () => {
  it("Should output string, whose length is one larger than the list's length converted to string", () => {
    const listElements = [9, 10, 10e2, 10e3, 10e4];
    const listLengths = listElements.map(
      (listElements) => listElements.toString().length
    );
    const expected = listLengths.map((listLength) => listLength + 1);
    listLengths.map((listLength, index) =>
      expect(generatePaddedNumber(1, listLength).length).toBe(expected[index])
    );
  });
  it("Should output appropriate number of zeros", () => {
    const listLength = 4;
    const args = [
      { sequenceNumber: 1, expected: 4 },
      { sequenceNumber: 10, expected: 3 },
      { sequenceNumber: 100, expected: 2 },
      { sequenceNumber: 1000, expected: 1 },
    ].forEach((arg) => {
      const { sequenceNumber, expected } = arg;
      const paddedNumber = generatePaddedNumber(sequenceNumber, listLength);
      const prependedZeroesMatch = paddedNumber.match(/(?<zeroes>0+(?=[1-9]))/);
      expect(prependedZeroesMatch).not.toBeNull();
      const numberOfZeros = prependedZeroesMatch!.groups!.zeroes!.length;
      expect(numberOfZeros).toBe(expected);
    });
  });
});

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
