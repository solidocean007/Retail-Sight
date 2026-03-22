module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "import", "prettier"],
  ignorePatterns: [".eslintrc.js", "/lib/**/*"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    quotes: ["error", "double"],
    indent: ["off"],
    "linebreak-style": ["error", "unix"],
    "max-len": ["error", { code: 130 }],
    "prettier/prettier": [
      "error",
      {
        tabWidth: 2,
        useTabs: false,
      },
    ],
    curly: "off",
    "valid-jsdoc": "off",
    "import/no-unresolved": 0,
  },
};
