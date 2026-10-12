// Minimal flat ESLint configuration.
// Install eslint first:  npm i -D eslint
// Then run:             npx eslint . --ext .ts
module.exports = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
];

