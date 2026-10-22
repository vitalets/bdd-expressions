# bdd-expressions

Expressive BDD step syntax inspired by [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions).

## Features

- Named parameters
  - `I open :page`
- Named parameters with type
  - `I have :count{int} cucumbers`
- Anonymous parameters
  - `I have {int} cucumbers`
- Inline types
  - `Set :status{pending/approved/rejected}`
- Optionals with parameters
  - `I create :item( as :owner)`
- Nested optionals
  - `I create :item( as :owner( in :workspace))`
- Multi-word alternatives without escaping
  - `I (click/tap on/press and hold) button`
- Alternatives with parameters
  - `I choose (page :page/label :label)`
- All Cucumber Expressions rules
  - `I have {int} cucumber(s) in my belly/stomach`

## Full syntax

See the [full syntax guide](docs/syntax.md) for all supported syntax, rules, and examples.

## Usage

See the [TypeScript API guide](docs/api.md) for creating expressions, matching values, custom parameter types, and capture metadata.

## Comparison with Cucumber Expressions

This comparison uses the JavaScript implementation, `@cucumber/cucumber-expressions@20.1.0`, which is the project's pinned compatibility reference.

| Capability                             | BDD Expressions                                                      | Cucumber Expressions (JavaScript)                                               |
| -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Anonymous typed parameters             | `{int}`, `{string}`, custom types, and all 11 built-ins              | Same familiar forms and built-ins                                               |
| Named parameters                       | `:page`, `:count{int}`; positional and `params` access               | Positional parameters; no `:name` declaration syntax                            |
| Optional literal text                  | `cucumber(s)`                                                        | `cucumber(s)`                                                                   |
| Parameters inside optional groups      | Supported: `( as :owner)`                                            | Not supported                                                                   |
| Nested optional groups                 | Supported: `( as :owner( in :workspace))`                            | Not supported                                                                   |
| Short alternatives                     | `belly/stomach`                                                      | `belly/stomach`                                                                 |
| Multiword structural alternatives      | `(click/tap on/press and hold)`                                      | Bare alternatives with escaped spaces, such as `click/tap\ on/press\ and\ hold` |
| Inline type                            | `{pending/approved}` or `:status{pending/approved}`                  | Requires a registered custom type                                               |
| Parameters in choice branches          | Supported; unselected parameters keep `undefined` slots              | Parameters are not allowed in alternatives                                      |
| Optional whitespace                    | Explicitly include it inside the optional group                      | Explicitly include it inside the optional group                                 |
| Arbitrary text                         | Greedy `{}`; ambiguous boundaries remain possible                    | Greedy `{}`; ambiguous boundaries remain possible                               |
| Custom types                           | Factory API; accepts registries exposing `lookupByTypeName`          | `ParameterType` and `ParameterTypeRegistry` class APIs                          |
| Transformed values                     | Async `matchValues(text, world?)`, plus low-level `getValue(world?)` | Low-level arguments with `getValue(world)`                                      |
| Reporter metadata                      | Raw text, UTF-16 positions, and nested capture groups                | Raw text, UTF-16 positions, and nested capture groups                           |
| Bare-alternative whitespace boundaries | All ECMAScript whitespace                                            | ASCII spaces in the pinned version                                              |
| Runtime implementation                 | Independent implementation with no runtime dependencies              | Separate Cucumber package                                                       |

Shared built-ins, quoted strings, simple optionals, bare choices, custom transformations, and reporter fields are covered by differential tests. New syntax can change the meaning of formerly literal text, so existing expressions are not universally syntax compatible. BDD Expressions also enforces its own type-name, empty-choice, and custom-regexp restrictions.

Reporter serialization matches the field shape verified against playwright-bdd 9.2.1. Framework parser selection may still require an adapter; this is not a drop-in framework replacement or a promise of Cucumber class `instanceof` compatibility. Automatic optional whitespace, lists/cardinality, ignored-capture syntax, and arbitrary-text ambiguity resolution are outside the current scope.

## Architecture

BDD Expressions borrows the architecture of
[Cucumber Expressions](https://github.com/cucumber/cucumber-expressions/blob/main/ARCHITECTURE.md):
parse the expression string into an AST, then compile that AST into a regular
expression used to match input text and capture parameter values.

See the upstream document for the architectural approach and the
[syntax guide](docs/syntax.md) for this library's language extensions.

## License

[MIT](LICENSE).
