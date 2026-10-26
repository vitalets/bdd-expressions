# bdd-expressions

[![lint](https://github.com/vitalets/bdd-expressions/actions/workflows/lint.yaml/badge.svg)](https://github.com/vitalets/bdd-expressions/actions/workflows/lint.yaml)
[![test](https://github.com/vitalets/bdd-expressions/actions/workflows/test.yaml/badge.svg)](https://github.com/vitalets/bdd-expressions/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/bdd-expressions)](https://www.npmjs.com/package/bdd-expressions)
[![license](https://img.shields.io/npm/l/bdd-expressions)](https://github.com/vitalets/bdd-expressions/blob/main/LICENSE)

Extended syntax for BDD steps, inspired by [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions).

## Features

- Named parameters with type
  - `I open :page{string}`
  - `I set rating :rating{int}`
- Named parameters without type
  - `I open :page` (treated as `{string}`)
- Anonymous parameters (same as in Cucumber)
  - `I open {string}`
  - `I set rating {int}`
- Inline choice parameters
  - `Set status {pending/approved/rejected}`
- Optional text with parameters
  - `I create :item( as :owner)`
- Nested optional text
  - `I create :item( as :owner( in :workspace))`
- Multi-word alternatives without escaping
  - `I (click/tap on/press and hold) button`
- Alternatives with parameters
  - `I choose (page :page/label :label)`
- Full support for Cucumber Expressions syntax
  - `I have {int} cucumber(s) in my belly/stomach`

## Try it

Try expressions in the [online playground](https://vitalets.github.io/bdd-expressions).

## Syntax

See the [syntax guide](https://vitalets.github.io/bdd-expressions/syntax/) for all supported syntax and examples.

## Programmatic Usage

See the [TypeScript API guide](docs/api.md).

## Comparison with Cucumber Expressions

Comparison with the JavaScript implementation, `@cucumber/cucumber-expressions@20.1.0`.

| Capability                               | Cucumber Expressions                                                                                                                                                                                               | BDD Expressions                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Named parameters                         | ❌ ([#206](https://github.com/cucumber/cucumber-expressions/issues/206))                                                                                                                                           | ✅ `:page`, `:count{int}`          |
| Anonymous typed parameters               | ✅ `{int}`, `{string}`, 11 built-ins                                                                                                                                                                               | ✅ Same built-ins                  |
| Inline choice types                      | ❌ Requires a custom type ([#304](https://github.com/cucumber/cucumber-expressions/issues/304))                                                                                                                    | ✅ `{pending/approved}`            |
| Optional text with parameters            | ❌ ([#305](https://github.com/cucumber/cucumber-expressions/issues/305), [#166](https://github.com/cucumber/cucumber-expressions/issues/166), [#299](https://github.com/cucumber/cucumber-expressions/issues/299)) | ✅ `( as :owner)`                  |
| Nested optional text                     | ❌                                                                                                                                                                                                                 | ✅ `( as :owner( in :workspace))`  |
| Multi-word alternatives without escaping | ❌ Spaces must be escaped ([#41](https://github.com/cucumber/cucumber-expressions/issues/41#issuecomment-963823708), [#75](https://github.com/cucumber/cucumber-expressions/issues/75#issuecomment-1048148209))    | ✅ `(click/tap on/press and hold)` |
| Alternatives with parameters             | ❌ ([#41](https://github.com/cucumber/cucumber-expressions/issues/41#issuecomment-966888362))                                                                                                                      | ✅ `(page :page/label :label)`     |
| Optional literal text                    | ✅ `cucumber(s)`                                                                                                                                                                                                   | ✅ `cucumber(s)`                   |
| Single-word alternatives                 | ✅ `belly/stomach`                                                                                                                                                                                                 | ✅ `belly/stomach`                 |
| Explicit optional whitespace             | ✅ `( again)`                                                                                                                                                                                                      | ✅ `( again)`                      |
| Arbitrary text                           | ✅ `{}`                                                                                                                                                                                                            | ✅ `{}`                            |
| Custom parameter types                   | ✅                                                                                                                                                                                                                 | ✅                                 |

## Acknowledgements

Thanks to the [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions) contributors for the syntax and architecture that inspired this package, and for the parameter types, capture handling, and test cases adapted here. See [third-party notices](THIRD_PARTY_NOTICES.md) for attribution and license details.

## License

[MIT](LICENSE).
