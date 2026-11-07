# bdd-expressions

[![lint](https://github.com/vitalets/bdd-expressions/actions/workflows/lint.yaml/badge.svg)](https://github.com/vitalets/bdd-expressions/actions/workflows/lint.yaml)
[![test](https://github.com/vitalets/bdd-expressions/actions/workflows/test.yaml/badge.svg)](https://github.com/vitalets/bdd-expressions/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/bdd-expressions)](https://www.npmjs.com/package/bdd-expressions)
[![license](https://img.shields.io/npm/l/bdd-expressions)](https://github.com/vitalets/bdd-expressions/blob/main/LICENSE)

Extended syntax for BDD steps, a superset of [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions).

🚀 [Playground](https://vitalets.github.io/bdd-expressions) | [Syntax](https://vitalets.github.io/bdd-expressions/syntax/) | [API](docs/api.md) | [Comparison](#comparison-with-cucumber-expressions)

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
  - `I send a message( with attachment(s))`
- Multi-word alternatives without escaping
  - `I send message( to my boss/ later)` (optional)
  - `I [click/tap on/press and hold] button` (required)
- Alternatives with parameters
  - `I choose [page :page/label :label]`
- DocString and DataTable in the expression
  - `I send a message:{DocString}`
  - `I create users(:{DataTable})` (optional table)
- Full support for Cucumber Expressions syntax
  - `I have {int} cucumber(s) in my belly/stomach`

## Automatic Type Inference

The `BddExpression` constructor automatically infers parameter types from your expression, providing accurate TypeScript typings, autocomplete, and compile-time checks for named parameters and optional captures.

```ts
const expression = new BddExpression('I buy :count{int} apples( for :owner)', registry);
const result = await expression.matchAndResolve('I buy 2 apples');
/*
{
  count: number;
  owner: string | undefined;
}
*/
```

Built-in `{DocString}` and `{DataTable}` types support required and optional values. See [DocString and DataTable types](docs/api.md#docstring-and-datatable).

See the [API guide](docs/api.md#named-parameter-inference) for details and how to supply manual types or disable inference.

## Comparison with Cucumber Expressions

Comparison with the JavaScript implementation, `@cucumber/cucumber-expressions@20.1.0`.

| Capability                               | Cucumber Expressions                                                                                                                                                                                               | BDD Expressions                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Named parameters                         | ❌ ([#206](https://github.com/cucumber/cucumber-expressions/issues/206))                                                                                                                                           | ✅ `:page`, `:count{int}`                 |
| Anonymous typed parameters               | ✅ 11 built-ins, e.g. `{int}`, `{string}`                                                                                                                                                                          | ✅ Same 11 built-ins                      |
| Inline choice types                      | ❌ Requires a custom type ([#304](https://github.com/cucumber/cucumber-expressions/issues/304))                                                                                                                    | ✅ `{pending/approved}`                   |
| Optional text with parameters            | ❌ ([#305](https://github.com/cucumber/cucumber-expressions/issues/305), [#166](https://github.com/cucumber/cucumber-expressions/issues/166), [#299](https://github.com/cucumber/cucumber-expressions/issues/299)) | ✅ `( as :owner)`                         |
| Nested optional text                     | ❌                                                                                                                                                                                                                 | ✅ `( with attachment(s))`                |
| Multi-word alternatives without escaping | ❌ Spaces must be escaped ([#41](https://github.com/cucumber/cucumber-expressions/issues/41#issuecomment-963823708), [#75](https://github.com/cucumber/cucumber-expressions/issues/75#issuecomment-1048148209))    | ✅ `[click/tap on/press and hold]`        |
| Alternatives with parameters             | ❌ ([#41](https://github.com/cucumber/cucumber-expressions/issues/41#issuecomment-966888362))                                                                                                                      | ✅ `[page :page/label :label]`            |
| DocString and DataTable in expression    | ❌ ([#1059](https://github.com/cucumber/cucumber-js/issues/1059), [#1287](https://github.com/cucumber/cucumber-js/issues/1287))                                                                                    | ✅ Built-in `{DocString}`, `{DataTable}`. |
| Optional literal text                    | ✅ `cucumber(s)`                                                                                                                                                                                                   | ✅ `cucumber(s)`                          |
| Single-word alternatives                 | ✅ `belly/stomach`                                                                                                                                                                                                 | ✅ `belly/stomach`                        |
| Explicit optional whitespace             | ✅ `( again)`                                                                                                                                                                                                      | ✅ `( again)`                             |
| Arbitrary text                           | ✅ `{}`                                                                                                                                                                                                            | ✅ `{}`                                   |
| Custom parameter types                   | ✅                                                                                                                                                                                                                 | ✅                                        |

## IDE support

The [official Cucumber extension](https://github.com/cucumber/vscode) and [Cucumber (Gherkin) Full Support](https://github.com/alexkrechik/VSCucumberAutoComplete) for VS Code **do not currently support** the full BDD Expressions syntax for mapping feature steps to their implementations.

🛠️ Work is in progress on a dedicated VS Code extension for BDD Expressions.

## Acknowledgements

Thanks to the [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions) contributors for the syntax and architecture that inspired this package, and for the parameter types, capture handling, and test cases adapted here. See [third-party notices](THIRD_PARTY_NOTICES.md) for attribution and license details.

## License

[MIT](LICENSE).
