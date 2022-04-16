/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "\\.[jt]sx?$": "ts-jest",
  },
  globals: {
    "ts-jest": {
      useEDM: true,
      isolatedModules: true,
    },
  },
  moduleNameMapper: {
    "(.+)\\.js": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
  maxWorkers: 1,
};
