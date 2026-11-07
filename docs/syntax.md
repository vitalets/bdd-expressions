# Syntax

Expressions match the entire input and are case sensitive. Ordinary text and whitespace match literally. Parameters capture arguments; optional groups and structural alternatives do not add arguments themselves.

- [Cheatsheet](#cheatsheet)
- [Parameters](#parameters)
  - [Anonymous parameters](#anonymous-parameters)
  - [Named parameters with type](#named-parameters-with-type)
  - [Named parameters without type](#named-parameters-without-type)
  - [Inline choice parameters](#inline-choice-parameters)
  - [Arbitrary text](#arbitrary-text)
  - [Custom parameter types](#custom-parameter-types)
  - [Built-in parameter types](#built-in-parameter-types)
- [Optional groups](#optional-groups)
  - [Optional suffix](#optional-suffix)
  - [Optional text](#optional-text)
  - [Optional text with parameters](#optional-text-with-parameters)
  - [Nested optional text](#nested-optional-text)
  - [Consecutive optional text](#consecutive-optional-text)
- [Alternatives](#alternatives)
  - [Single-word alternatives](#single-word-alternatives)
  - [Multi-word alternatives without escaping](#multi-word-alternatives-without-escaping)
  - [Alternatives with parameters](#alternatives-with-parameters)
- [DocString and DataTable](#docstring-and-datatable)
  - [DocString](#docstring)
  - [DataTable](#datatable)
- [Escaping](#escaping)
- [Localization](#localization)

## Cheatsheet

| Syntax        | Quick meaning                                | Expression                          | Step                   |
| ------------- | -------------------------------------------- | ----------------------------------- | ---------------------- |
| `{type}`      | Capture a typed value                        | `I have {int} cucumbers`            | `I have 2 cucumbers`   |
| `:name{type}` | Capture a typed value by name                | `I have :count{int} cucumbers`      | `I have 2 cucumbers`   |
| `:name`       | Capture a quoted string by name              | `I open :page`                      | `I open "Settings"`    |
| `{a/b}`       | Capture one of the listed choices            | `Set {pending/approved}`            | `Set approved`         |
| `:name{a/b}`  | Capture one of the listed choices by name    | `Set :status{pending/approved}`     | `Set approved`         |
| `{=text}`     | Capture a fixed literal                      | `Delete {=permanently}`             | `Delete permanently`   |
| `{}`          | Capture arbitrary text, including empty text | `I send {}`                         | `I send hello there`   |
| `(text)`      | Optional text                                | `cucumber(s)`                       | `cucumbers`            |
| `a/b`         | Single-word alternatives                     | `I pay by card/cash`                | `I pay by cash`        |
| `[a/b]`       | Multi-word alternatives                      | `I pay [by credit card/with cash]`  | `I pay with cash`      |
| `(a/b)`       | Optional multi-word alternatives             | `I log in( with Google/ via email)` | `I log in with Google` |
| `\`           | Escape a special character                   | `I open \[draft\]`                  | `I open [draft]`       |

Only parameters capture values; parentheses and square brackets group text without capturing it. Spaces match literally, so include a space inside an optional group when it should be optional too.

## Parameters

Named parameters also occupy positional slots. Each example shows captured params first as a positional array, then as a named object from `values.params`. String values are quoted; `undefined` marks an absent parameter.

### Anonymous parameters

Put a registered type name in curly braces (`{type}`) to capture a value by position. See [Built-in parameter types](#built-in-parameter-types) for the full list and conversions.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>I have {int} cucumbers</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I have 2 cucumbers</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>[2]</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td>—</td>
    </tr>
  </tbody>
</table>

Use `{string}` to capture a single- or double-quoted string. The surrounding quotes are removed from the captured value:

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>I open {string}</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I open "Settings"</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['Settings']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td>—</td>
    </tr>
  </tbody>
</table>

### Named parameters with type

Use `:name{type}` to capture a typed value by name. The value remains available by position too.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>I have :count{int} cucumbers</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I have 2 cucumbers</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>[2]</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  count: 2
}</code></pre></td>
    </tr>
  </tbody>
</table>

> [!NOTE]
> Parameters can directly follow literal text without a separating space. Escape a literal colon when it would otherwise start a parameter; see [Escaping](#escaping).

### Named parameters without type

Untyped `:name` parameters default to `{string}` and require single or double quotes in the input. The transformer removes the surrounding quotes and unescapes `\"` and `\'`; it leaves other backslashes unchanged. Empty quoted strings are allowed. Quotes written explicitly in the expression are literal: `":page"` requires an extra pair of literal quotes around the quoted parameter. There is no automatic number inference.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>I open :page</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I open 'Settings'</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['Settings']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  page: "Settings"
}</code></pre></td>
    </tr>
  </tbody>
</table>

Parameter names use ASCII letters, digits, `_`, and `$`, and cannot start with a digit. They are case sensitive and must be unique across the entire expression, including mutually exclusive branches. `{page}` looks up a registered type named `page`; it never declares a named parameter. Unknown types are errors.

### Inline choice parameters

Put slash-separated literals inside curly braces to capture the selected text. No custom type registration is needed.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>Set {pending/approved/rejected}</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>Set approved</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['approved']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td>—</td>
    </tr>
  </tbody>
</table>

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>Set :status{pending/approved/rejected}</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>Set approved</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['approved']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  status: "approved"
}</code></pre></td>
    </tr>
  </tbody>
</table>

Inline choice parameters can contain whole phrases. Spaces inside each branch are literal and need no escaping.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>I :action{click/tap on/press and hold}</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I press and hold</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['press and hold']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  action: "press and hold"
}</code></pre></td>
    </tr>
  </tbody>
</table>

Prefix the contents with `=` to capture a single literal instead of looking up a registered type:

```text
I delete the account( :permanent{=permanently})
```

A single-literal choice captures the literal when present and `undefined` when its optional group is omitted. Text outside the braces, including surrounding whitespace, is not part of the captured value.

The explicit marker also supports multiple choices (`{=pending/approved}`), whole phrases (`{=for good}`), and the empty literal (`{=}`). It always takes an explicit value; it never reuses the parameter name. Existing escaping rules apply: `{=a\/b}` captures `a/b`. To capture a value beginning with `=`, put it after the marker: `{==pending}` captures `=pending`.

Empty branches are allowed: `:status{pending/}` captures either `'pending'` or `''`. Empty choices capture `''`, whereas an omitted optional group produces `undefined`. For example, `( :status{pending/})` can capture `''` when the group matches just its space.

### Arbitrary text

Use `{}` or `:name{}` to capture arbitrary text, including an empty string, without spanning newlines.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>I send {}</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I send hello there</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['hello there']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td>—</td>
    </tr>
  </tbody>
</table>

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>I send :message{}</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I send hello there</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['hello there']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  message: "hello there"
}</code></pre></td>
    </tr>
  </tbody>
</table>

> This syntax is not recommended because matching is greedy and can make capture boundaries ambiguous. For example, `I send {} to {}` can split at a later `to` than intended. Prefer a specific parameter type.

### Custom parameter types

Register a custom type to match and transform domain-specific values, then use its name in curly braces.

These examples use the `Point` transformer defined in [Custom parameter types](api.md#custom-parameter-types).

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>Move to {Point}</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>Move to 3,-2</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>[{ x: 3, y: -2 }]</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td>—</td>
    </tr>
  </tbody>
</table>

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td align="left"><strong><code>Move to :point{Point}</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>Move to 3,-2</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>[{ x: 3, y: -2 }]</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  point: { x: 3, y: -2 }
}</code></pre></td>
    </tr>
  </tbody>
</table>

### Built-in parameter types

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

Parentheses always make their contents optional, including when they contain slash-separated alternatives. Adding another alternative preserves the option to omit the group.

### Optional suffix

Wrap a suffix in parentheses to accept a word with or without that suffix. The optional text does not create a captured parameter.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="2" align="center"><strong><code>I have {int} cucumber(s)</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I have 1 cucumber</code></td>
      <td><code>I have 2 cucumbers</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>[1]</code></td>
      <td><code>[2]</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td>—</td>
      <td>—</td>
    </tr>
  </tbody>
</table>

### Optional text

Wrap text in parentheses to make it optional. Include its leading space inside the group so the space is optional too.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="2" align="center"><strong><code>I open :page( again)</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I open "Settings"</code></td>
      <td><code>I open "Settings" again</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['Settings']</code></td>
      <td><code>['Settings']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  page: "Settings"
}</code></pre></td>
      <td><pre><code>{
  page: "Settings"
}</code></pre></td>
    </tr>
  </tbody>
</table>

### Optional text with parameters

An optional group can contain parameters. When the group is absent, those parameters keep their positions and have `undefined` values.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="2" align="center"><strong><code>I create :item( as :owner)</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I create "document"</code></td>
      <td><code>I create "document" as "Alice"</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>['document', undefined]</code></td>
      <td><code>['document', 'Alice']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  item: "document",
  owner: undefined
}</code></pre></td>
      <td><pre><code>{
  item: "document",
  owner: "Alice"
}</code></pre></td>
    </tr>
  </tbody>
</table>

### Nested optional text

Put one parenthesized group inside another to create nested optionals. An inner group can match only when its enclosing group matches; omitting the outer group omits everything inside it.

<table class="match-examples">
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="2" align="left"><strong><code>I send a message( with attachment(s))</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input #1</th>
      <td><code>I send a message with attachments</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #2</th>
      <td><code>I send a message with</code></td>
      <td class="match-status"><span role="img" aria-label="Does not match">❌</span></td>
    </tr>
  </tbody>
</table>

### Consecutive optional text

Place optional groups next to each other to allow either, both, or neither. Distinct literal prefixes make it clear which parameter each input value belongs to.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="4" align="center"><strong><code>I send( message :message)( to :recipient)</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I send</code></td>
      <td><code>I send message "Hello"</code></td>
      <td><code>I send to "Alice"</code></td>
      <td><code>I send message "Hello" to "Alice"</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>[undefined, undefined]</code></td>
      <td><code>['Hello', undefined]</code></td>
      <td><code>[undefined, 'Alice']</code></td>
      <td><code>['Hello', 'Alice']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  message: undefined,
  recipient: undefined
}</code></pre></td>
      <td><pre><code>{
  message: "Hello",
  recipient: undefined
}</code></pre></td>
      <td><pre><code>{
  message: undefined,
  recipient: "Alice"
}</code></pre></td>
      <td><pre><code>{
  message: "Hello",
  recipient: "Alice"
}</code></pre></td>
    </tr>
  </tbody>
</table>

Put optional spaces **inside** the group. `I create :item (as :owner)` always requires a space after the item, even when the group is absent. Whitespace is never trimmed or normalized.

Absent parameters retain their positional slots and have `undefined` values and capture positions. Their transformers are not called.

> [!CAUTION]
> Consecutive optionals use native greedy matching and backtracking. For `I send( :message)( :recipient)`, input `I send "Alice"` fills `message`. For `I send( :message)( :recipient confirmed)`, input `I send "Alice" confirmed` fills `recipient` instead. Distinguishing literal text, such as `message` and `to` in the examples, makes the intended assignment clear.

## Alternatives

Use `/` to choose between words or phrases. Structural choices match text without capturing it; choices inside braces return the selected text. Branches are tried in source order, with backtracking when needed. `|` is ordinary literal text, not an alternative operator.

### Single-word alternatives

Separate words with `/` to accept either spelling without capturing it as a parameter. Outside groups, alternatives are bounded by unescaped ASCII spaces (`U+0020`), direct parameters, or the expression edges. Tabs, newlines, and Unicode whitespace remain literal branch text; punctuation and adjacent groups do not end a bare alternative. A space can be escaped to include it in a branch, for example `click/tap\ on`.

<table class="match-examples">
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="2" align="left"><strong><code>I pay by card/cash</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input #1</th>
      <td><code>I pay by card</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #2</th>
      <td><code>I pay by cash</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #3</th>
      <td><code>I pay by cheque</code></td>
      <td class="match-status"><span role="img" aria-label="Does not match">❌</span></td>
    </tr>
  </tbody>
</table>

A direct parameter ends a bare alternative: `a/b:count{int}` requires a count after either letter. Prefer `[a/b]:count{int}` to make this shared scope explicit. Inside brackets, branches can include parameters: `[a:count{int}/b]` requires a count only after `a`, and `[a/b:count{int}]` requires one only after `b`. An adjacent group stays within its bare branch: `a/b[:count{int}]` also requires a count only after `b`.

### Multi-word alternatives without escaping

Put slash-separated phrases in a group to avoid escaping spaces. Parentheses make the choice optional; square brackets require a choice. The selected phrase is not captured as a parameter.

| Choice   | Expression                               |
| -------- | ---------------------------------------- |
| Optional | `I send message( to my boss/ later)`     |
| Required | `I [click/tap on/press and hold] button` |

Spaces are literal. Only slashes at the current nesting level separate branches; slashes inside nested groups or braces do not affect the enclosing group.

#### Optional alternatives

Use `(a/b)` to allow one branch or omit the entire group. Adding branches does not make the group required.

<table class="match-examples">
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="2" align="left"><strong><code>I send message( to my boss/ later)</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input #1</th>
      <td><code>I send message</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #2</th>
      <td><code>I send message to my boss</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #3</th>
      <td><code>I send message later</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #4</th>
      <td><code>I send message to my boss later</code></td>
      <td class="match-status"><span role="img" aria-label="Does not match">❌</span></td>
    </tr>
  </tbody>
</table>

#### Required alternatives

Use `[a/b]` to require one branch. A bracketed group remains required even with a single branch. Bare alternatives outside groups are also required.

<table class="match-examples">
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="2" align="left"><strong><code>I [click/tap on/press and hold] button</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input #1</th>
      <td><code>I click button</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #2</th>
      <td><code>I tap on button</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #3</th>
      <td><code>I press and hold button</code></td>
      <td class="match-status"><span role="img" aria-label="Matches">✅</span></td>
    </tr>
    <tr>
      <th scope="row">Input #4</th>
      <td><code>I hover over the button</code></td>
      <td class="match-status"><span role="img" aria-label="Does not match">❌</span></td>
    </tr>
  </tbody>
</table>

#### Empty branches and nested groups

An empty branch lets a required group match empty text. It can appear before, after, or between other branches: `[/again]`, `[again/]`, and `[again//once more]`. Empty branches in optional groups are redundant, since parentheses already allow omission.

Repeated empty branches are allowed. `[/]`, `[]`, `(/)`, and `()` match empty text without capturing parameters. Required and optional groups can nest inside each other. The enclosing group controls whether a nested choice is reached; each nested group keeps its own required or optional behavior.

### Alternatives with parameters

Each choice branch can declare its own parameters. Positional slots follow source order, and parameters in unselected branches remain `undefined`. Indexes never shift with the chosen branch.

<table>
  <tbody>
    <tr>
      <th scope="row">Expression</th>
      <td colspan="2" align="center"><strong><code>I choose [number :count{int}/label :label]</code></strong></td>
    </tr>
    <tr>
      <th scope="row">Input</th>
      <td><code>I choose number 2</code></td>
      <td><code>I choose label "two"</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (positional)</th>
      <td><code>[2, undefined]</code></td>
      <td><code>[undefined, 'two']</code></td>
    </tr>
    <tr>
      <th scope="row">Captured params (named)</th>
      <td><pre><code>{
  count: 2,
  label: undefined
}</code></pre></td>
      <td><pre><code>{
  count: undefined,
  label: "two"
}</code></pre></td>
    </tr>
  </tbody>
</table>

## DocString and DataTable

`{DocString}` and `{DataTable}` receive values supplied separately from the step text. Both support names and optional groups.

### DocString

**`I send a message:{DocString}`**

Use `{DocString}` to require a separately supplied string, which may span multiple lines.

✅ **Matches — message body provided**

```gherkin
When I send a message:
  """
  Hello Alice,
  Your order is ready.
  """
```

❌ **Does not match — required message body missing**

```gherkin
When I send a message:
```

#### Optional DocString

Wrap `{DocString}` and any punctuation that introduces it in the same optional group. The punctuation must be present exactly when the DocString is supplied.

**`the notification is shown(:{DocString})`**

✅ **Matches — check that a notification appears**

```gherkin
Then the notification is shown
```

✅ **Matches — also check its text**

```gherkin
Then the notification is shown:
  """
  Your order is confirmed.
  We will email you when it ships.
  """
```

### DataTable

**`I have {int} product(s) in the cart:{DataTable}`**

Use `{DataTable}` to require a separately supplied table. It can follow text parameters in the same expression.

✅ **Matches — one expected product**

```gherkin
Then I have 1 product in the cart:
  | name     | price |
  | Keyboard | 50    |
```

✅ **Matches — two expected products**

```gherkin
Then I have 2 products in the cart:
  | name     | price |
  | Keyboard | 50    |
  | Mouse    | 25    |
```

❌ **Does not match — required products table missing**

```gherkin
Then I have 2 products in the cart:
```

#### Optional DataTable

**`I have {int} product(s) in the cart(:{DataTable})`**

Wrap `{DataTable}` and its introducing punctuation in the same optional group to require or omit them together.

✅ **Matches — zero products, no table needed**

```gherkin
Then I have 0 products in the cart
```

✅ **Matches — one product with expected details**

```gherkin
Then I have 1 product in the cart:
  | name     | price |
  | Keyboard | 50    |
```

✅ **Matches — two products with expected details**

```gherkin
Then I have 2 products in the cart:
  | name     | price |
  | Keyboard | 50    |
  | Mouse    | 25    |
```

✅ **Matches — check only the count**

```gherkin
Then I have 2 products in the cart
```

Matching checks whether the table is present, not whether its contents agree with other parameters. Validate those relationships in the step handler.

❌ **Does not match — colon provided without a table**

```gherkin
Then I have 1 product in the cart:
```

❌ **Does not match — table provided without the colon**

```gherkin
Then I have 1 product in the cart
  | name     | price |
  | Keyboard | 50    |
```

Use separate optional groups, `(:)({DataTable})`, to make punctuation and table presence independent. Named parameters and custom table types are also supported.

DocString and DataTable parameters must be last, and each kind can occur only once, including across alternatives. Whitespace and colons may introduce the next parameter but cannot trail the final one. Missing required values or unexpected supplied values prevent matching. Resolved arguments follow expression order.

See [DocString and DataTable types](api.md#docstring-and-datatable) for passing values and registering custom types.

## Escaping

Use a backslash to make special characters literal. Expression-language escapes support `\\`, `\/`, `\:`, `\(`, `\)`, `\[`, `\]`, `\{`, `\}`, and ASCII space. Other whitespace is written literally, without a backslash. Other escapes and a trailing backslash are errors. Unmatched closing delimiters are errors too.

| Expression text         | Matches literally     |
| ----------------------- | --------------------- |
| `https:\/\/example.com` | `https://example.com` |
| `label\:value`          | `label:value`         |
| `\[draft\]`             | `[draft]`             |
| `\(draft\)`             | `(draft)`             |
| `\{name\}`              | `{name}`              |
| `a\\b`                  | `a\b`                 |

An unescaped colon starts a parameter only when followed by a valid name-start character. No preceding whitespace is required: `foo:bar` contains the parameter `bar`, and `v:major{int}.:minor{int}` contains two integer parameters. To match literal `foo:bar`, write `foo\:bar`.

Colons in `12:30` and `https:` are already literal; URL slashes still need escaping. Inside braces, colons are literal, and literal parentheses, square brackets, or opening braces must be escaped. Braces cannot be nested.

For escaping expression strings in TypeScript, see [Escaping in string literals](api.md#escaping-in-string-literals).

## Localization

Expression text and inline choice values may use any language.

**`Compro :count{int} manzanas( para :owner)`**

✅ **Matches — with an owner**

```gherkin
Cuando Compro 2 manzanas para "Ana"
```

|                         |                              |
| ----------------------- | ---------------------------- |
| Captured params (named) | `count: 2`<br>`owner: 'Ana'` |

✅ **Matches — without an owner**

```gherkin
Cuando Compro 2 manzanas
```

|                         |                                  |
| ----------------------- | -------------------------------- |
| Captured params (named) | `count: 2`<br>`owner: undefined` |

Localization restrictions:

- Parameter names follow `[A-Za-z_$][A-Za-z0-9_$]*`; registered type names additionally
  allow `.` and `-` after the first character. For example, `:café` means parameter
  `caf` followed by literal `é`, while `:árbol` is entirely literal text.
- Syntax uses ASCII `:`, `{}`, `()`, `[]`, and `/`. Fullwidth variants are literal text.
- Built-in numeric types use ASCII digits and a decimal point, not localized digits
  or decimal commas. Default string parameters require ASCII single or double quotes.
  Custom parameter types can support localized value formats.
- Matching does not normalize Unicode: composed and decomposed accents remain distinct.
- The 256-character inference limit still applies. Combining marks and joined emoji
  can consume multiple characters even when displayed as one symbol.

See [named parameter inference](api.md#named-parameter-inference) for inference rules and [custom parameter types](api.md#custom-parameter-types) for localized value formats.
