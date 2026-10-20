export default {
  '*.{ts,tsx,mts,js,mjs}': ['oxlint --type-aware --deny-warnings --fix', 'oxfmt --write'],
  '*.{json,jsonc,yaml,yml,md}': 'oxfmt --write',
};
