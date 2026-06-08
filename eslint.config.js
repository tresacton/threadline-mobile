// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // We intentionally sync fetched server data into local editable form state
      // inside effects (settings, job-finder) and auto-prompt biometrics on mount.
      // These are correct, contained uses; the react-compiler advisory is too
      // strict for them.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
