import { type JestConfigWithTsJest } from "ts-jest";
const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  
  maxWorkers: 1,
  moduleNameMapper: { "(.+)\\.js": "$1","^@batch-rename/(.*)$": "<rootDir>/packages/$1/src" },
};

export default jestConfig;
