import type { GenerateRenameListArgs, ValidTextFormats } from "@batch-rename/lib";
import {
    formatFile,
    formatTextTransform
} from "../converters/formatTextTransform.js";
import {
    textFormatMatrix as examples,
    textFormatRenameList as splitFileList
} from "./mocks.js";

describe("formatFile", () => {
  it("Should convert text to uppercase", () => {
    examples.forEach((example, index) => {
      expect(formatFile(example.value, "uppercase")).toBe(
        examples[index].expected.uppercase
      );
    });
  });
  it("Should convert text to lowercase", () => {
    examples.forEach((example, index) => {
      expect(formatFile(example.value, "lowercase")).toBe(
        examples[index].expected.lowercase
      );
    });
  });
  it("Should capitalize text", () => {
    examples.forEach((example, index) => {
      expect(formatFile(example.value, "capitalize")).toBe(
        examples[index].expected.capitalize
      );
    });
  });
  it("Should return unchanged list, if invalid arg passed", () => {
    examples.forEach((example) => {
      expect(formatFile(example.value, "invalid" as ValidTextFormats)).toBe(
        example.value
      );
    });
  });
});

describe("formatTextTransform", () => {
  const baseArgs: GenerateRenameListArgs = {
    transformPattern: ["format"],
    splitFileList,
    noExtensionPreserve: true,
    truncate: undefined,
    format: undefined,
  };
  it("Should return expected values", () => {
    const transformTypes = ["uppercase", "lowercase", "capitalize"] as const;
    transformTypes.forEach((format) => {
      const response = formatTextTransform({ ...baseArgs, format });
      response.forEach((fileInfo, index) => {
        const received = fileInfo.rename, expected = examples[index].expected[format];
        expect(received).toBe(expected);
      }
      );
    });
  });
});
