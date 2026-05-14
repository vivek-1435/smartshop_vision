module.exports = {
  env: { node: true, es2022: true, jest: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2022 },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_|next' }],
    'no-console': 'off',
    'no-process-exit': 'off',
    eqeqeq: ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
  },
};
