# Syntax

Expressions match the entire input and are case sensitive. Ordinary text and whitespace match literally. Parameters capture arguments; optional groups and structural alternatives do not add arguments themselves.

- [Parameters](#parameters)
  - [Anonymous Parameters](#anonymous-parameters)
  - [Named parameters](#named-parameters)
  - [Inline choice](#inline-choice)
  - [Arbitrary text](#arbitrary-text)
  - [Custom types](#custom-types)
  - [Built-in types](#built-in-types)
- [Optional groups](#optional-groups)
  - [Optional suffix](#optional-suffix)
  - [Optional phrase](#optional-phrase)
  - [Optional phrase with parameter](#optional-phrase-with-parameter)
  - [Nested optional parameters](#nested-optional-parameters)
  - [Consecutive optional parameters](#consecutive-optional-parameters)
- [Alternatives](#alternatives)
  - [Single-word alternatives](#single-word-alternatives)
  - [Multi-word alternatives](#multi-word-alternatives)
  - [Optional alternative](#optional-alternative)
  - [Alternatives with parameters](#alternatives-with-parameters)
- [Escaping](#escaping)

## Parameters

Named parameters also occupy positional slots. Each example shows captured params first as a positional array, then as a named object from `values.params`. String values are quoted; `undefined` marks an absent parameter.

### Anonymous Parameters

Put a type name in curly braces to capture a value by position, for example `{int}`, `{string}`, or `{word}`. See [Built-in types](#built-in-types) for the full list and conversions.

For example, `{int}` captures an integer:

|                              |                          |
| ---------------------------- | ------------------------ |
| Expression                   | `I have {int} cucumbers` |
| Input                        | `I have 2 cucumbers`     |
| Captured params (positional) | `[2]`                    |
| Captured params (named)      | —                        |

Use `{string}` to capture a single- or double-quoted string. The surrounding quotes are removed from the captured value:

|                              |                     |
| ---------------------------- | ------------------- |
| Expression                   | `I open {string}`   |
| Input                        | `I open "Settings"` |
| Captured params (positional) | `['Settings']`      |
| Captured params (named)      | —                   |

### Named parameters

Add `:name` before the type in curly braces to give the captured value a name. The value remains available by position too.

For example, `:count{int}` captures an integer as `count`:

|                              |                                                                       |
| ---------------------------- | --------------------------------------------------------------------- |
| Expression                   | `I have :count{int} cucumbers`                                        |
| Input                        | `I have 2 cucumbers`                                                  |
| Captured params (positional) | `[2]`                                                                 |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>count: 2</code><br><code>}</code> |

Untyped `:name` parameters default to `{string}` and require single or double quotes in the input. The transformer removes the surrounding quotes and unescapes `\"` and `\'`; it leaves other backslashes unchanged. Empty quoted strings are allowed. Quotes written explicitly in the expression are literal: `":page"` requires an extra pair of literal quotes around the quoted parameter. There is no automatic number inference.

|                              |                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Expression                   | `I open :page`                                                                |
| Input                        | `I open 'Settings'`                                                           |
| Captured params (positional) | `['Settings']`                                                                |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>page: "Settings"</code><br><code>}</code> |

Parameter names use ASCII letters, digits, `_`, and `$`, and cannot start with a digit. They are case sensitive and must be unique across the entire expression, including mutually exclusive branches. `{page}` looks up a registered type named `page`; it never declares a named parameter. Unknown types are errors.

### Inline choice

Put slash-separated literals inside curly braces to capture the selected text. No custom type registration is needed. Every branch must be nonempty; wrap the parameter in an optional group to allow absence.

|                              |                                   |
| ---------------------------- | --------------------------------- |
| Expression                   | `Set {pending/approved/rejected}` |
| Input                        | `Set approved`                    |
| Captured params (positional) | `['approved']`                    |
| Captured params (named)      | —                                 |

|                              |                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Expression                   | `Set :status{pending/approved/rejected}`                                        |
| Input                        | `Set approved`                                                                  |
| Captured params (positional) | `['approved']`                                                                  |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>status: "approved"</code><br><code>}</code> |

Inline choices can contain whole phrases. Spaces inside each branch are literal and need no escaping.

|                              |                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Expression                   | `I :action{click/tap on/press and hold}`                                              |
| Input                        | `I press and hold`                                                                    |
| Captured params (positional) | `['press and hold']`                                                                  |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>action: "press and hold"</code><br><code>}</code> |

### Arbitrary text

Use `{}` or `:name{}` to capture arbitrary text, including an empty string, without spanning newlines.

|                              |                      |
| ---------------------------- | -------------------- |
| Expression                   | `I send {}`          |
| Input                        | `I send hello there` |
| Captured params (positional) | `['hello there']`    |
| Captured params (named)      | —                    |

|                              |                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Expression                   | `I send :message{}`                                                                 |
| Input                        | `I send hello there`                                                                |
| Captured params (positional) | `['hello there']`                                                                   |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>message: "hello there"</code><br><code>}</code> |

> This syntax is not recommended because matching is greedy and can make capture boundaries ambiguous. For example, `I send {} to {}` can split at a later `to` than intended. Prefer a specific parameter type.

### Custom types

Register a custom type to match and transform domain-specific values, then use its name in curly braces.

These examples use the `Point` transformer defined in [Custom parameter types](../README.md#custom-parameter-types).

|                              |                     |
| ---------------------------- | ------------------- |
| Expression                   | `Move to {Point}`   |
| Input                        | `Move to 3,-2`      |
| Captured params (positional) | `[{ x: 3, y: -2 }]` |
| Captured params (named)      | —                   |

|                              |                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Expression                   | `Move to :point{Point}`                                                             |
| Input                        | `Move to 3,-2`                                                                      |
| Captured params (positional) | `[{ x: 3, y: -2 }]`                                                                 |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>point: { x: 3, y: -2 }</code><br><code>}</code> |

### Built-in types

These built-in types define which input is accepted and how it becomes a captured value.

| Type                                   | Example input                | Transformed value                                   |
| -------------------------------------- | ---------------------------- | --------------------------------------------------- |
| `{int}`, `{byte}`, `{short}`, `{long}` | `-42`                        | Number `-42`; aliases do not enforce integer bounds |
| `{biginteger}`                         | `12345678901234567890`       | BigInt `12345678901234567890n`                      |
| `{float}`, `{double}`                  | `-1.5E2`                     | Number `-150`                                       |
| `{bigdecimal}`                         | `1.50`                       | String `'1.50'`, preserving the original text       |
| `{word}`                               | `Settings`                   | String `'Settings'`; any non-whitespace sequence    |
| `{string}`                             | `"Settings"` or `'Settings'` | String `'Settings'`, without surrounding quotes     |
| `{}`                                   | `hello there`                | String `'hello there'`, including empty text        |

Numeric patterns follow the tested Cucumber built-ins: floating-point types accept uppercase `E` exponents, but not lowercase `e` or trailing decimal points. Every built-in also supports the named form, such as `:amount{float}`.

## Optional groups

Parentheses without a slash at their own nesting level make their contents optional.

### Optional suffix

Wrap a suffix in parentheses to accept a word with or without that suffix. The optional text does not create a captured parameter.

Without the optional suffix:

|                              |                            |
| ---------------------------- | -------------------------- |
| Expression                   | `I have {int} cucumber(s)` |
| Input                        | `I have 1 cucumber`        |
| Captured params (positional) | `[1]`                      |
| Captured params (named)      | —                          |

With the optional suffix:

|                              |                            |
| ---------------------------- | -------------------------- |
| Expression                   | `I have {int} cucumber(s)` |
| Input                        | `I have 2 cucumbers`       |
| Captured params (positional) | `[2]`                      |
| Captured params (named)      | —                          |

### Optional phrase

Wrap a phrase in parentheses to make it optional. Include its leading space inside the group so the space is optional too.

Without the optional phrase:

|                              |                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Expression                   | `I open :page( again)`                                                        |
| Input                        | `I open "Settings"`                                                           |
| Captured params (positional) | `['Settings']`                                                                |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>page: "Settings"</code><br><code>}</code> |

With the optional phrase:

|                              |                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Expression                   | `I open :page( again)`                                                        |
| Input                        | `I open "Settings" again`                                                     |
| Captured params (positional) | `['Settings']`                                                                |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>page: "Settings"</code><br><code>}</code> |

### Optional phrase with parameter

An optional group can contain parameters. When the group is absent, those parameters keep their positions and have `undefined` values.

Without an owner:

|                              |                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Expression                   | `I create :item( as :owner)`                                                                                                |
| Input                        | `I create "document"`                                                                                                       |
| Captured params (positional) | `['document', undefined]`                                                                                                   |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>item: "document",</code><br>&nbsp;&nbsp;<code>owner: undefined</code><br><code>}</code> |

With an owner:

|                              |                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Expression                   | `I create :item( as :owner)`                                                                                              |
| Input                        | `I create "document" as "Alice"`                                                                                          |
| Captured params (positional) | `['document', 'Alice']`                                                                                                   |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>item: "document",</code><br>&nbsp;&nbsp;<code>owner: "Alice"</code><br><code>}</code> |

### Nested optional parameters

Nest optional groups to make one phrase depend on another. Here, the workspace phrase can appear only when the owner phrase is present.

|                              |                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Expression                   | `I create :item( as :owner( in :workspace))`                                                                                                                             |
| Input                        | `I create "document" as "Alice" in "Team"`                                                                                                                               |
| Captured params (positional) | `['document', 'Alice', 'Team']`                                                                                                                                          |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>item: "document",</code><br>&nbsp;&nbsp;<code>owner: "Alice",</code><br>&nbsp;&nbsp;<code>workspace: "Team"</code><br><code>}</code> |

### Consecutive optional parameters

Place optional groups next to each other to allow either, both, or neither. Distinct literal prefixes make it clear which parameter each input value belongs to.

Neither optional group is present:

|                              |                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Expression                   | `I send( message :message)( to :recipient)`                                                                                       |
| Input                        | `I send`                                                                                                                          |
| Captured params (positional) | `[undefined, undefined]`                                                                                                          |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>message: undefined,</code><br>&nbsp;&nbsp;<code>recipient: undefined</code><br><code>}</code> |

Only the message is present:

|                              |                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Expression                   | `I send( message :message)( to :recipient)`                                                                                     |
| Input                        | `I send message "Hello"`                                                                                                        |
| Captured params (positional) | `['Hello', undefined]`                                                                                                          |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>message: "Hello",</code><br>&nbsp;&nbsp;<code>recipient: undefined</code><br><code>}</code> |

Only the recipient is present:

|                              |                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Expression                   | `I send( message :message)( to :recipient)`                                                                                     |
| Input                        | `I send to "Alice"`                                                                                                             |
| Captured params (positional) | `[undefined, 'Alice']`                                                                                                          |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>message: undefined,</code><br>&nbsp;&nbsp;<code>recipient: "Alice"</code><br><code>}</code> |

Both optional groups are present:

|                              |                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Expression                   | `I send( message :message)( to :recipient)`                                                                                   |
| Input                        | `I send message "Hello" to "Alice"`                                                                                           |
| Captured params (positional) | `['Hello', 'Alice']`                                                                                                          |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>message: "Hello",</code><br>&nbsp;&nbsp;<code>recipient: "Alice"</code><br><code>}</code> |

Put optional spaces **inside** the group. `I create :item (as :owner)` always requires a space after the item, even when the group is absent. Whitespace is never trimmed or normalized.

Absent parameters retain their positional slots and have `undefined` values and capture positions. Their transformers are not called. In a nested group, the inner phrase can appear only when its enclosing group appears.

> [!CAUTION]
> Consecutive optionals use native greedy matching and backtracking. For `I send( :message)( :recipient)`, input `I send "Alice"` fills `message`. For `I send( :message)( :recipient confirmed)`, input `I send "Alice" confirmed` fills `recipient` instead. Distinguishing literal text, such as `message` and `to` in the examples, makes the intended assignment clear.

## Alternatives

Use `/` to choose between words or phrases. Structural choices match text without capturing it; choices inside braces return the selected text. Branches are tried in source order, with backtracking when needed. `|` is ordinary literal text, not an alternative operator.

### Single-word alternatives

Separate words with `/` to accept either spelling without capturing it as a parameter. Outside parentheses, alternatives are bounded by whitespace, parameters, or the expression edges. A space can be escaped to include it in a branch, for example `click/tap\ on`.

Paying by card:

|                              |                      |
| ---------------------------- | -------------------- |
| Expression                   | `I pay by card/cash` |
| Input                        | `I pay by card`      |
| Captured params (positional) | —                    |
| Captured params (named)      | —                    |

Paying by cash:

|                              |                      |
| ---------------------------- | -------------------- |
| Expression                   | `I pay by card/cash` |
| Input                        | `I pay by cash`      |
| Captured params (positional) | —                    |
| Captured params (named)      | —                    |

### Multi-word alternatives

Put slash-separated phrases in parentheses to require one of them. The selected phrase is not captured as a parameter. Spaces are literal and need no escaping. Only slashes at the current nesting level separate branches; slashes inside nested groups or braces do not affect the enclosing group.

With the `click` branch:

|                              |                                          |
| ---------------------------- | ---------------------------------------- |
| Expression                   | `I (click/tap on/press and hold) button` |
| Input                        | `I click button`                         |
| Captured params (positional) | —                                        |
| Captured params (named)      | —                                        |

With the `tap on` branch:

|                              |                                          |
| ---------------------------- | ---------------------------------------- |
| Expression                   | `I (click/tap on/press and hold) button` |
| Input                        | `I tap on button`                        |
| Captured params (positional) | —                                        |
| Captured params (named)      | —                                        |

With the `press and hold` branch:

|                              |                                          |
| ---------------------------- | ---------------------------------------- |
| Expression                   | `I (click/tap on/press and hold) button` |
| Input                        | `I press and hold button`                |
| Captured params (positional) | —                                        |
| Captured params (named)      | —                                        |

### Optional alternative

Include an empty branch anywhere in parenthesized alternatives to allow no text or one of the listed phrases: `(/again)`, `(again/)`, and `(again//once more)` are valid. An optional group with a single phrase, such as `( again)`, is shorthand for the equivalent alternative with an empty first branch: `(/ again)`.

With the empty branch (no suffix):

|                              |                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Expression                   | `I open :page(/ again/ once more)`                                            |
| Input                        | `I open "Settings"`                                                           |
| Captured params (positional) | `['Settings']`                                                                |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>page: "Settings"</code><br><code>}</code> |

With the `again` suffix:

|                              |                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Expression                   | `I open :page(/ again/ once more)`                                            |
| Input                        | `I open "Settings" again`                                                     |
| Captured params (positional) | `['Settings']`                                                                |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>page: "Settings"</code><br><code>}</code> |

Repeated empty branches are allowed. `(/)` and `()` match empty text without capturing parameters.

### Alternatives with parameters

Each choice branch can declare its own parameters. Positional slots follow source order, and parameters in unselected branches remain `undefined`. Indexes never shift with the chosen branch.

The number branch captures `count`:

|                              |                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Expression                   | `I choose (number :count{int}/label :label)`                                                                        |
| Input                        | `I choose number 2`                                                                                                 |
| Captured params (positional) | `[2, undefined]`                                                                                                    |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>count: 2,</code><br>&nbsp;&nbsp;<code>label: undefined</code><br><code>}</code> |

The label branch captures `label`:

|                              |                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Expression                   | `I choose (number :count{int}/label :label)`                                                                            |
| Input                        | `I choose label "two"`                                                                                                  |
| Captured params (positional) | `[undefined, 'two']`                                                                                                    |
| Captured params (named)      | <code>{</code><br>&nbsp;&nbsp;<code>count: undefined,</code><br>&nbsp;&nbsp;<code>label: "two"</code><br><code>}</code> |

## Escaping

Use a backslash to make special characters literal. Expression-language escapes support `\\`, `\/`, `\:`, `\(`, `\)`, `\{`, `\}`, and whitespace. Other escapes and a trailing backslash are errors. Unmatched closing delimiters are errors too.

| Expression text         | Matches literally     |
| ----------------------- | --------------------- |
| `https:\/\/example.com` | `https://example.com` |
| `label\:value`          | `label:value`         |
| `\(draft\)`             | `(draft)`             |
| `\{name\}`              | `{name}`              |
| `a\\b`                  | `a\b`                 |

An unescaped colon starts a parameter only when followed by a valid name-start character. Colons in `12:30` and `https:` are already literal; URL slashes still need escaping. Inside braces, colons are literal, and literal parentheses or opening braces must be escaped. Braces cannot be nested.

JavaScript string literals add their own escaping layer. `String.raw` lets you write expression escapes directly:

```ts
import { createExpression } from 'bdd-expressions';

const url = createExpression(String.raw`Visit https:\/\/example.com label\:value`);
url.match('Visit https://example.com label:value'); // []
```
