# Changelog

## [Unreleased]

- Export `BddExpression` for `new BddExpression(pattern, parameterTypeRegistry)`;
  retain `createExpression` as a compatibility factory.

- Allow empty branches anywhere in parenthesized alternatives, including repeated
  empty branches, all-empty choices, and empty optional groups.

- Clarify consecutive optional parameter groups: native greedy matching with
  backtracking, stable absent slots, and literal text to distinguish groups.
- Remove the tsx development dependency and run tests with Node 24's native TypeScript support.
- Add BDD expressions with named parameters, nested optional groups, literal
  choices, custom parameter types, and capture metadata.
- Add asynchronous transformed values with positional and named access.
- Add Oxc linting and formatting, Git hooks, and release infrastructure.
