// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "airbnb-base",
    "airbnb-typescript/base",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parserOptions: { project: "./tsconfig.base.json" },
  rules: {
    "no-nested-ternary": "off",
    "no-useless-escape": "off",
    "no-console": "off",
    "consistent-return": "off",
    "import/prefer-default-export": "off",
    "one-var": "off",
    "no-restricted-syntax": [
      "error",
      {
        selector: "LabeledStatement",
        message:
          "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.",
      },
      {
        selector: "WithStatement",
        message:
          "`with` is disallowed in strict mode because it makes code impossible to predict and optimize.",
      },
    ],
    "no-await-in-loop": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/quotes": ["warn", "double", { avoidEscape: true }],
    "@typescript-eslint/return-await": "off",
    "@typescript-eslint/no-shadow": "off",
  },
  overrides: [
    {
      files: ["*.spec.ts"],
      rules: {
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
};
