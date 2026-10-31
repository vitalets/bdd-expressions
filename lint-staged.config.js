export default {
  '*.{ts,tsx,mts,js,mjs}': [
    'oxlint --type-aware --deny-warnings --fix',
    'oxfmt --write --no-error-on-unmatched-pattern',
  ],
  '*.{json,jsonc,yaml,yml,md}': 'oxfmt --write --no-error-on-unmatched-pattern',
};
