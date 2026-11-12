# Changelog

## [Unreleased]

## [0.2.1] - 2026-11-12

- **Breaking:** Parentheses are always optional, including alternatives. Use square brackets for required groups (`[a/b]` or `[a]`), with empty branches allowing explicit omission (`[a/]`). Migrate required `(a/b)` groups to `[a/b]` and escape literal brackets as `\[` and `\]`. Bare alternative boundaries and whitespace escapes now use only ASCII space, matching Cucumber Expressions.

- **Breaking:** Replace the separate world, DocString, and DataTable parameters of `matchAndResolve` with one options object: `{ world, docString, dataTable }`.

- Support built-in trailing DataTable and DocString parameters with typed inputs and result properties, optional groups, `dataTable` and `docString` flags for custom parameter types, and `expression.hasDocString` / `expression.hasDataTable` for runner integrations.

- Support explicit inline literals with `{=value}` and empty inline choice alternatives, with inferred literal types.

- Show compiler-inferred parameter types in the playground using the library’s actual TypeScript definitions.

## [0.2.0] - 2026-10-31

- Add automatic named parameter type inference, with custom type mappings, bounded compiler work, and manual parameter contracts.

- Add a browser playground with expression examples, match highlighting, and shareable URLs that preserve inputs.

## [0.1.1] - 2026-10-23

- Initial release.

[unreleased]: https://github.com/vitalets/bdd-expressions/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/vitalets/bdd-expressions/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/vitalets/bdd-expressions/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/vitalets/bdd-expressions/releases/tag/v0.1.1
