import type { BaseRenameList, GenerateRenameListArgs } from "@batch-rename/lib";
import { EXT_REGEX } from "@batch-rename/lib";
import { extensionModifyTransform } from "../converters/extensionModify.js";
import { generateMockSplitFileList } from "./mocks.js";

const returnExtension = (renameList: BaseRenameList): string[] =>
  renameList.map((fileTransform) => {
    const { rename } = fileTransform;
    const extPosition = rename.search(EXT_REGEX);
    return rename.slice(extPosition);
  });

describe("extensionModifyTransform", () => {
  const splitFileList = generateMockSplitFileList(3);
  const extensionModify = ".new";
  const args: GenerateRenameListArgs = {
    splitFileList,
    extensionModify,
    transformPattern: ["extensionModify"],
  };
  it("Should return file with new extension", () => {
    const transformedExtensions = returnExtension(extensionModifyTransform(args));
    transformedExtensions.forEach((newExtension) => expect(newExtension).toBe(extensionModify));
  });
  it("Should add a dot character, if missing from extensionModify argument", () => {
    const transformedExtensions = returnExtension(
      extensionModifyTransform({ ...args, extensionModify: "new" })
    );
    transformedExtensions.forEach((newExtension) => expect(newExtension).toBe(extensionModify));
  });
});
