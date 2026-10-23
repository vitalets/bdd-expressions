# bdd-expressions

Expressive BDD step syntax inspired by [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions).

## Features

- Named parameters with type
  - `I open :page{string}`
  - `I set rating :rating{int}`
- Named parameters without type
  - `I open :page` (treated as `:page{string}`)
- Anonymous parameters (same as in Cucumber)
  - `I open {string}`
  - `I set rating {int}`
- Inline choice parameters
  - `Set status {pending/approved/rejected}`
- Optionals with parameters
  - `I create :item( as :owner)`
- Nested optionals
  - `I create :item( as :owner( in :workspace))`
- Multi-word alternatives without escaping
  - `I (click/tap on/press and hold) button`
- Alternatives with parameters
  - `I choose (page :page/label :label)`
- Full support for Cucumber Expressions syntax
  - `I have {int} cucumber(s) in my belly/stomach`

See the [syntax guide](docs/syntax.md) for all supported syntax, rules, and examples.

## Usage

See the [TypeScript API guide](docs/api.md) for creating expressions, matching values, custom parameter types, and capture metadata.

## Comparison with Cucumber Expressions

Comparison with the JavaScript implementation, `@cucumber/cucumber-expressions@20.1.0`.

| Capability                               | BDD Expressions                          | Cucumber Expressions                                                                                                                                                                                               |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Named parameters                         | ✅ `:page`, `:count{int}`                | ❌ ([#206](https://github.com/cucumber/cucumber-expressions/issues/206))                                                                                                                                           |
| Anonymous typed parameters               | ✅ `{int}`, `{string}`, all 11 built-ins | ✅ Same built-ins                                                                                                                                                                                                  |
| Inline types                             | ✅ `{pending/approved}`                  | ❌ Requires a custom type ([#304](https://github.com/cucumber/cucumber-expressions/issues/304))                                                                                                                    |
| Optionals with parameters                | ✅ `( as :owner)`                        | ❌ ([#305](https://github.com/cucumber/cucumber-expressions/issues/305), [#166](https://github.com/cucumber/cucumber-expressions/issues/166), [#299](https://github.com/cucumber/cucumber-expressions/issues/299)) |
| Nested optionals                         | ✅ `( as :owner( in :workspace))`        | ❌ ([#41](https://github.com/cucumber/cucumber-expressions/issues/41#issuecomment-963023587))                                                                                                                      |
| Multi-word alternatives without escaping | ✅ `(click/tap on/press and hold)`       | ❌ Spaces must be escaped ([#41](https://github.com/cucumber/cucumber-expressions/issues/41#issuecomment-963823708), [#75](https://github.com/cucumber/cucumber-expressions/issues/75#issuecomment-1048148209))    |
| Alternatives with parameters             | ✅ `(page :page/label :label)`           | ❌ ([#41](https://github.com/cucumber/cucumber-expressions/issues/41))                                                                                                                                             |
| Optional literal text                    | ✅ `cucumber(s)`                         | ✅ `cucumber(s)`                                                                                                                                                                                                   |
| Single-word alternatives                 | ✅ `belly/stomach`                       | ✅ `belly/stomach`                                                                                                                                                                                                 |
| Explicit optional whitespace             | ✅ `( again)`                            | ✅ `( again)`                                                                                                                                                                                                      |
| Arbitrary text                           | ✅ `{}`                                  | ✅ `{}`                                                                                                                                                                                                            |
| Custom parameter types                   | ✅                                       | ✅                                                                                                                                                                                                                 |

## Acknowledgements

Thanks to the [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions) contributors for the syntax and architecture that inspired this package, and for the parameter types, capture handling, and test cases adapted here. See [third-party notices](THIRD_PARTY_NOTICES.md) for attribution and license details.

## License

[MIT](LICENSE).
