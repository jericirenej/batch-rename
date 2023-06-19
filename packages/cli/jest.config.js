import defaultSetup from "../../jest.base.config.js";

const jestConfig = {
  ...defaultSetup,
  displayName: "CLI",
  rootDir: "../../",
  roots: ["./packages/cli/"],
};

export default jestConfig;
