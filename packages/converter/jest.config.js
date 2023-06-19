import defaultSetup from "../../jest.base.config.js";

const jestConfig = {
  ...defaultSetup,
  displayName: "Converter",
  rootDir: "../../",
  roots: ["./packages/converter/"],
};

export default jestConfig;
