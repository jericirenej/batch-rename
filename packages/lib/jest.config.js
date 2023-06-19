import defaultSetup from "../../jest.base.config.js";

const jestConfig = {
  ...defaultSetup,
  displayName: "Lib",
  rootDir: "../../",
  roots: ["./packages/lib/"],
};

export default jestConfig;
