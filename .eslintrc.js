module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    "plugin:vue/essential",
    "airbnb-base",
    "prettier",
    "prettier/vue",
    "prettier/react",
  ],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  parserOptions: {
    ecmaVersion: 11,
    sourceType: "module",
  },
  plugins: ["vue"],
  rules: {
    "no-underscore-dangle": "off",
    "consistent-return": "off",
    "no-param-reassign": "off",
    "no-unused-vars": "off",
    "no-nested-ternary": "off"
  },
};
