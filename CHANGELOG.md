# Changelog

## [Unreleased]

- Use type aliases for exported types; declaration merging is no longer supported.

- Rename the exported `Values` type to `MatchValues` to identify the result of `matchValues()`.

- Remove the redundant `Expression` interface; use `BddExpression` as the instance type.

- Export `BddExpression` for `new BddExpression(pattern, parameterTypeRegistry)`;
  remove the `createExpression` factory. The registry argument remains required.

- Allow empty branches anywhere in parenthesized alternatives, including repeated
  empty branches, all-empty choices, and empty optional groups.

- Clarify consecutive optional parameter groups: native greedy matching with
  backtracking, stable absent slots, and literal text to distinguish groups.
- Remove the tsx development dependency and run tests with Node 24's native TypeScript support.
- Add BDD expressions with named parameters, nested optional groups, literal
  choices, custom parameter types, and capture metadata.
- Add asynchronous transformed values with positional and named access.
- Add Oxc linting and formatting, Git hooks, and release infrastructure.
