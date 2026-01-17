
module.exports = {
  root: true,
  extends: [
    "plugin:vue/vue3-essential",
    "plugin:vuetify/base",
    "eslint:recommended",
    "@vue/eslint-config-typescript",
  ],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "max-len": [
      2,
      {
        code: 130,
        ignorePattern: '".*":\\s*".*",?',
      },
    ],
    "vue/max-attributes-per-line": [
      "error",
      {
        singleline: {
          max: 1,
        },
        multiline: {
          max: 1,
        },
      },
    ],
    "vue/valid-v-slot": [
      "error",
      {
        allowModifiers: true,
      },
    ],
    "no-console": [
      "warn",
      {
        allow: ["warn", "error", "debug", "info"],
      },
    ],
  },
};
