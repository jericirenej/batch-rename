/** @type {import('jest').Config} */

import baseConfig from "./jest.base.config.js";

const workspaces = ["lib", "converter", "cli"],
  dir = "<rootDir>/packages",
  config = "jest.config.js";

const projects = workspaces.map((project) => `${dir}/${project}/${config}`);

const jestConfig = {
  ...baseConfig,
  projects,
};

export default jestConfig;
