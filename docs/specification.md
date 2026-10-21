Implement a new JavaScript/TypeScript library called bdd-expressions.

First preserve the specification below in this repository, then implement the library in small, verifiable stages.

## 1. Persist the specification before implementation

Read the repository and its instructions, including AGENTS.md, before making changes. Preserve useful existing configuration and conventions.

Create these documents:

### docs/specification.md

This is the authoritative specification of BDD Expressions.

Save ALL language rules from this prompt here, including:
- parameter syntax;
- quoted strings;
- anonymous parameters;
- optional groups and nesting;
- alternatives;
- escaping;
- literal whitespace;
- matching semantics;
- positional and named results;
- capture metadata;
- compatibility requirements;
- examples;
- explicitly unresolved language questions.

Include a concise syntax reference table and a formal grammar once the remaining lexical rules have been resolved.

Do not create a separate grammar.md or syntax.md that duplicates this specification. Syntax and grammar belong in docs/specification.md.

The document must be complete enough for another implementation session to continue without this conversation or the original prompt.

### docs/implementation-plan.md

Save the implementation stages, acceptance criteria, progress, and remaining work.

Reference docs/specification.md instead of duplicating its language rules.

### docs/decisions.md

Record architecture decisions, their rationale, and resolutions of initially open questions.

Distinguish:
- requirements supplied by the user;
- implementation decisions;
- unresolved questions.

When a decision changes or completes the language definition, update docs/specification.md as well. The decisions document explains why; the specification defines the resulting behavior.

### AGENTS.md and README.md

Add a short instruction to AGENTS.md requiring future contributors and agents to:
- read docs/specification.md before changing syntax, matching, or public APIs;
- consult docs/implementation-plan.md for remaining work;
- update the specification and tests when behavior changes;
- record significant decisions in docs/decisions.md.

Create a small AGENTS.md if none exists. Preserve existing instructions.

Link these documents from README.md.

After creating the documents, proceed with implementation. Do not stop after writing a plan.

Resolve routine implementation details independently and document them. Ask only when an unresolved question would materially change public behavior and cannot reasonably be resolved from these requirements.

## 2. Goals and scope

BDD Expressions is a readable language for BDD step definitions, visually close to Cucumber Expressions.

The first version targets JavaScript/TypeScript only.

Use:
- one npm package at the repository root;
- a small handwritten parser;
- an AST;
- compilation to native JavaScript RegExp;
- native match indices;
- ordinary TypeScript tests;
- compatible capture metadata for integrations and reporters.

Do not use runtime dependencies on:
- @cucumber/cucumber-expressions;
- regexp-match-indices.

Using @cucumber/cucumber-expressions as a development dependency for differential tests is acceptable.

Do not implement initially:
- list/cardinality syntax such as cfparse;
- automatic number inference;
- AI matching;
- a custom regular-expression engine;
- implementations for other programming languages;
- a snippet generator;
- an LSP server or editor extension.

Lists can be represented with DataTables at the framework level.

Do not promise that every existing Cucumber expression remains syntactically compatible. New special constructs may conflict with previously literal text. Document intentional differences.

## 3. Parameter syntax

### Anonymous typed parameters

Preserve the familiar Cucumber forms:

    {int}
    {float}
    {word}
    {string}
    {CustomType}
    {}

Inspect the current JavaScript implementation of Cucumber Expressions for its complete built-in parameter set. The examples above are not necessarily an exhaustive list.

Port the relevant built-in patterns and transformations deliberately. Do not approximate quotation, escaping, or numeric behavior when compatibility can be tested.

### Named parameters

Use:

    :page
    :count{int}
    :amount{float}
    :owner{CustomType}

The parameter name appears before the optional type in braces.

A named parameter without an explicit type defaults to string:

    I open :page

matches:

    I open "Settings"

and produces the value:

    Settings

Single-quoted input and escaped quotes should behave consistently with Cucumber's {string}.

Important distinctions:
- :page is a named string parameter.
- {page} refers to a registered parameter type named page.
- {string} refers to the built-in string type.
- Unknown types produce a useful error.
- Never decide whether something is a type or literal text based on whether a matching registry entry happens to exist.
- Do not infer numbers from string contents.
- Unquoted numbers require an explicit numeric type.

The exact identifier rules, handling of literal colons and URLs, and duplicate-name policy were not finalized. Resolve and document these before implementing the affected behavior.

### Quotation marks

{string} and untyped :name parameters require quotation marks in the input text and remove them from the transformed value.

Quotation marks explicitly written in the expression remain literal characters.

For example:

    I open :page
    I open {string}

are the normal ways to capture a quoted string.

Do not introduce special behavior that makes:

    I open ":page"

automatically mean “capture only the text between these quotation marks.”

Distinguish quotation in the expression language from quotation needed to write the expression as a JavaScript string literal.

### Anonymous arbitrary text

Retain {} for Cucumber compatibility.

Its behavior should match Cucumber:
- arbitrary text;
- empty text allowed;
- greedy matching.

Document it as discouraged when parameter boundaries can be ambiguous, but do not prohibit it.

For example:

    I send {} to {}

can split input unexpectedly when the input contains several occurrences of " to ".

A handwritten expression parser does not remove this matching ambiguity.

## 4. Optional groups

Parentheses without a top-level alternative separator mean optional text:

    I have {int} cucumber(s)
    I open :page( again)

Support:
- parameters inside optional groups;
- nested optional groups;
- nested optional groups containing parameters.

Examples:

    I create :item( as :owner)
    I create :item( as :owner( in :workspace))

When an optional group is absent:
- its parameters retain their positional slots;
- their transformed values are undefined;
- named access returns undefined;
- their transformers are not called;
- no capture positions are fabricated;
- reporters have no text to highlight for those parameters.

An absent capture and a capture of an empty string are different states.

Structural optional groups do not themselves become user arguments.

## 5. Whitespace

Whitespace is always literal.

Do not:
- trim expression text;
- normalize spaces;
- automatically include neighboring spaces in optional groups;
- replace literal spaces with arbitrary-whitespace patterns.

To make a space optional, put it inside the optional group:

    I create :item( as :owner)

In contrast:

    I create :item (as :owner)

contains a mandatory space before the optional group.

This is an intentional language rule.

## 6. Alternatives

Use slash / as the only alternative separator.

Do not introduce | as an alternative operator.

### Bare alternatives

Preserve Cucumber-style short alternatives:

    belly/stomach

Inspect upstream behavior and tests for boundaries and escaping. Preserve compatible behavior where our grammar has not intentionally changed it.

### Parenthesized alternatives

An unescaped slash at the current level of a parenthesized group makes that group a choice:

    I (click/tap on/press and hold) :target

This selects one of:
- click
- tap on
- press and hold

Spaces inside alternatives do not require escaping.

A choice is required unless it contains an empty alternative.

For an optional choice, use an empty FIRST alternative:

    I open :page(/ again/ once more)

This permits:
- no suffix;
- " again";
- " once more".

Spaces around separators are literal, not formatting.

Only separators at the current nesting level count.

For example:

    ( with :status{pending/approved})

is an optional group. The slash belongs to the parameter expression inside it and does not turn the enclosing group into a choice.

The policy for trailing empty alternatives, empty middle alternatives, completely empty groups, and repeated empty alternatives remains to be specified. The agreed primary notation for an optional choice uses an empty first branch.

### Captured inline alternatives

Support anonymous inline choices:

    {pending/approved/rejected}

and named inline choices:

    :status{pending/approved/rejected}
    :action{click/tap on/press and hold}

When a brace expression contains an unescaped slash:
- treat the alternatives as literal text;
- do not look them up in the parameter-type registry;
- return the selected text as one argument;
- require no custom type registration.

For example:

    {int/float}

matches the literal text "int" or "float". It does not select between numeric types.

Do not require an extra pair of parentheses inside braces.

Define empty-alternative behavior for captured inline choices separately. Do not automatically inherit every rule of parenthesized choices.

### Parameters in different branches

Specify positional argument behavior for parameters in alternative branches.

The preferred design is:
- slots follow parameter order in the expression source;
- parameters in unselected branches remain undefined;
- indexes never shift depending on the selected branch.

Record this as an implementation decision if adopted. Resolve any interaction with duplicate parameter names explicitly.

## 7. Escaping and source locations

Define escaping rules for:
- ordinary text;
- parenthesized groups;
- brace expressions;
- named-parameter syntax.

An escaped slash is literal and does not separate alternatives.

Respect nesting. Do not classify groups using a simple string includes('/') check.

Keep separate:
1. expression-language escaping;
2. JavaScript string-literal escaping;
3. escaping literal text when compiling RegExp.

AST source locations refer to the original expression, even when decoded text is shorter because escape characters were removed.

Provide useful errors with source positions for malformed expressions.

## 8. Matching results and public API

Separate low-level capture metadata from convenient transformed values.

### Low-level matching

Follow the Cucumber approach:

    expression.match(text): readonly Argument[] | null

Meaning:
- null: no match;
- []: successful match with no parameters.

Provide compatible argument fields and behavior:
- group;
- parameterType;
- getValue(world);
- other methods required by verified integration contracts.

Inspect the current upstream Expression, Argument, and Group interfaces before finalizing our interfaces.

Group metadata must represent:
- original captured text;
- start;
- end;
- child capture groups.

Capture positions refer to the step text, not the expression source.

Use JavaScript UTF-16 offsets and half-open ranges [start, end), consistent with RegExp indices and String.slice.

Preserve raw captures independently of transformed values:
- stripping quotes must not destroy their original locations;
- numeric conversion must not replace raw text in report metadata;
- custom types with nested capture groups must retain the required group structure.

Structural language groups must not create additional user arguments.

### Convenient transformed values

Provide a higher-level result consisting of a positional array with an additional params object:

    values[0]
    values.params.page

Named parameters remain positional arguments too.

Use params, not groups.

Do not run matching twice to produce the two representations.

Parameter names may be stored in compiled metadata, associated with argument indexes.

The exact method name for obtaining transformed values has not been agreed. Choose a small, clear API and record the decision.

Support:
- transformer this/world context;
- asynchronous or PromiseLike transformers;
- skipping transformers for absent parameters;
- safe handling of names such as __proto__;
- the documented duplicate-name policy.

Full compile-time inference from expression string literals is not a first-version requirement.

## 9. Reporter compatibility

Reporters should not need to understand BDD Expressions syntax.

Provide compatible capture values, positions, and child groups so integrations can serialize them to the same reporting format.

For example, integrations such as playwright-bdd serialize:
- group.start;
- group.value;
- group.children;
- parameterTypeName.

Verify the actual integration code before claiming compatibility.

Parameter names and parameter-type names are different concepts.

Choose and document how inline alternatives are represented as parameterType and parameterTypeName. Do not substitute the parameter's variable name for its type name.

A compatible match result does not automatically make this library a drop-in replacement for every framework. Framework parser selection may still need an adapter.

Do not promise compatibility with instanceof checks against Cucumber classes unless explicitly implemented and tested.

## 10. Parameter types and upstream code reuse

Port the necessary runtime behavior from Cucumber Expressions instead of depending on its runtime package.

Inspect and selectively reuse:
- built-in parameter definitions;
- matching patterns;
- numeric conversions;
- string quotation and escape handling;
- relevant contracts.

Retain required license and copyright notices. Record the upstream version or commit used.

TypeScript interfaces alone are insufficient: matching and conversion require runtime implementations.

Prefer plain objects and functions. Do not copy classes simply because upstream uses classes.

A registry may use Map.

Consider a small structural interface or adapter for accepting an existing Cucumber registry. Do not import private package internals.

Full support for Cucumber's constructor API, including new ParameterType(...), is not required initially.

## 11. Parser and compiler architecture

Use:

    expression source
    → handwritten recursive-descent parser
    → AST with source locations
    → semantic validation
    → RegExp and capture metadata
    → matching
    → compatible arguments
    → transformed values or reporter data

A separate tokenizer is optional. A small scanner with a current offset may be sufficient.

Do not add Peggy, Chevrotain, URLPattern, or path-to-regexp without a demonstrated need. The agreed direction is a small handwritten parser.

The grammar in docs/specification.md documents the language; generating parser code from that grammar is not required.

Represent concepts such as:
- literal;
- parameter;
- sequence;
- optional;
- choice.

These are conceptual categories, not mandatory type names.

During compilation:
- escape literal text correctly;
- use non-capturing groups for structural constructs;
- record capture-to-parameter mappings;
- match the entire step text;
- explicitly define and test trailing-newline behavior;
- never recover capture locations using indexOf.

Custom parameter regexes and {} can still be ambiguous. Do not add undocumented matching heuristics.

## 12. Native RegExp indices

Use the native d flag and match.indices.

Do not use regexp-match-indices.

Native match indices are available from Node.js 16.0.0, but choose the project's minimum supported Node version independently based on project requirements.

Configure TypeScript target/lib appropriately.

Native indices provide flat capture ranges, not a parent/child capture tree. The implementation must still provide the required Group.children structure and parameter mappings.

Do not count capture groups by naively counting parentheses. Custom patterns may contain:
- escaped parentheses;
- character classes;
- non-capturing groups;
- lookarounds;
- named capture groups.

Inspect upstream TreeRegexp and GroupBuilder. Selectively adapt a proven mechanism where useful.

Do not assume arbitrary backreferences remain correct after combining patterns. Identify and document the supported behavior and limitations.

## 13. Tests

Write ordinary TypeScript tests, using parameterized cases where useful.

Do not create one small YAML file per test case.

Retain the repository's test runner if suitable; otherwise select one and document the choice.

Cover:
1. Built-in and custom parameter types.
2. Named parameters and params access.
3. Optional and nested optional groups.
4. Parameters inside optional groups.
5. Bare and multiword alternatives.
6. Captured inline alternatives.
7. Literal whitespace and escaping.
8. Parsing errors and source positions.
9. Capture metadata and reporter compatibility.
10. Differential behavior against Cucumber for the shared subset.

Compare more than transformed values:
- match versus null;
- argument count and ordering;
- raw capture text;
- start/end positions;
- child groups;
- multi-capture transformations;
- world context.

Include meaningful edge cases:
- repeated identical captured text;
- Unicode and emoji before captures;
- empty quoted strings;
- absent optional parameters;
- empty {} captures;
- escaped quotation marks;
- nested capture groups in custom types;
- overlapping alternatives;
- greedy arbitrary-text captures;
- literal slashes and colons.

Do not copy upstream assertions that prohibit our intentionally supported constructs.

Separate:
- compatible behavior;
- intentional differences;
- unsupported behavior.

Test observable behavior rather than mirroring implementation details.

## 14. Repository setup

Use one package at the repository root.

Suggested locations:
- src/parser/
- src/compiler/
- src/matching/
- src/index.ts
- test/language/
- test/compatibility/
- docs/specification.md
- docs/implementation-plan.md
- docs/decisions.md
- README.md
- LICENSE
- AGENTS.md
- package.json
- tsconfig.json
- .github/workflows/

Avoid creating unnecessary empty folders or excessive abstraction. Combine small components when clearer.

Keep public exports deliberate and small.

Choose and document package format, exports, build configuration, and supported Node versions. ESM versus CJS has not been predetermined.

## 15. Relationship to Cucumber limitations

Document the needs this library addresses:
- named parameters;
- parameters inside optional groups;
- nested optional groups;
- captured inline alternatives;
- multiword alternatives without escaped spaces;
- usable capture positions and structure.

Explicitly avoid claiming to solve:
- automatic optional whitespace;
- lists and cardinality;
- arbitrary free-text ambiguity;
- special ignored-capture syntax;
- every custom-regex limitation;
- issues specific to non-JavaScript implementations.

An unused callback parameter is still a captured argument. It remains available in metadata and may be highlighted.

If referencing GitHub issues, verify their content before associating them with implemented features. Do not claim an issue is fully solved based only on its title.

## 16. Implementation stages

After saving the specification and plan:

1. Establish minimal build and test infrastructure.
2. Resolve and document missing lexical rules.
3. Implement the AST, parser, and diagnostics.
4. Implement the registry and built-in parameter types.
5. Implement compilation and matching with native indices.
6. Implement compatible Argument/Group metadata.
7. Implement transformed positional values with params.
8. Add differential compatibility tests.
9. Verify reporter serialization behavior.
10. Write README examples that actually work.

Keep each stage verifiable. Add tests alongside implementation rather than postponing them until the end.

Finish by reporting:
- what was implemented;
- which checks passed;
- which additional decisions were made;
- remaining limitations;
- links to docs/specification.md, docs/implementation-plan.md, and docs/decisions.md.

Do not publish the npm package or perform external releases without a separate request.
---

# Resolved language and API (normative, version 0.1)

The original brief above is preserved verbatim. This section resolves its open
questions and takes precedence over wording that labels those questions open.
There are no unresolved language questions for version 0.1. Future extensions
require a specification change, not registry-dependent parsing.

## Syntax reference

| Syntax | Meaning |
| --- | --- |
| `{int}`, `{CustomType}` | Anonymous registered type |
| `{}` | Greedy arbitrary text, including empty text |
| `:name` | Named quoted string |
| `:name{Type}` | Named registered type; `:name{}` is named arbitrary text |
| `{a/b}`, `:name{a/b}` | One inline choice (captures the selected literal) |
| `(text)` | Optional sequence, with nesting and parameters allowed |
| `(a/b c)` | Required structural choice, no argument of its own |
| `(/a/b)`, `(a//b)`, `(a/b/)` | Structural choice with an empty branch anywhere |
| `()`, `(/)` | Empty group or choice; matches empty text |
| `a/b` | Bare choice bounded by whitespace, parameters, or input edges |
| `\/`, `\:`, `\(` | Literal slash, colon, opening parenthesis |
| `|` | Ordinary literal character |

### Lexical rules

Names use ASCII `[A-Za-z_$][A-Za-z0-9_$]*`, case sensitive. Any unescaped
colon immediately followed by a valid name-start introduces a parameter,
regardless of adjacent text. Otherwise a colon is literal (`12:30`, `https:`).
Escape a colon before an identifier to keep it literal: `label\:value`.
Literal URLs must also escape their slashes: `https:\/\/example.com`.
Names are globally unique, even across mutually exclusive branches; duplicates
are errors at the second parameter. `__proto__` and `constructor` are legal.
Type identifiers use `[A-Za-z_$][A-Za-z0-9_$.-]*`, or the empty name for `{}`.
This deliberately excludes some exotic Cucumber type names.

Backslash escapes only `\`, `/`, `:`, `(`, `)`, `{`, `}`, and whitespace
(ECMAScript `\s`) in every expression context. Other escapes and a trailing
backslash are errors. Escaped whitespace is literal but does not delimit bare
alternatives. Quotes and `|` are ordinary characters and need no expression
escape. A backslash before a quote in the *input* follows the string parameter
pattern instead. JavaScript source requires another layer of escaping; use
`String.raw` when helpful. Unmatched closing braces/parentheses are errors.

Braces are not recursive. Unescaped `{`, `(`, `)` inside braces are errors;
escape them when they are literal inline-choice contents. Colons inside braces
are literal. An unescaped slash selects inline-choice syntax before any type
lookup. Without a slash the decoded content must be a type identifier.
Inline branches must all be nonempty; `{a/}`, `{/a}`, `{a//b}` are errors.
Use an optional group around the parameter for absence. Empty `{}` retains its
separate arbitrary-text meaning.

Groups split only on unescaped slashes at their own level; nested groups and
braces consume their contents first. With no such slash a group is optional,
including the empty group `()`. With slashes it is a choice over full sequences.
Any branch may be syntactically empty, including first, middle, last, repeated,
or all branches: `(a/)`, `(a//b)`, `(/)` and `()` are valid. Empty branches
consume no input and add no arguments. Alternatives retain source order and
native RegExp backtracking; an empty branch may be tried before a later nonempty
branch. Empty groups and all-empty choices match empty text. A nonempty branch
can itself match empty (e.g. nested optionals); syntactic emptiness and runtime
nullability are distinct.

At the root, bare alternatives operate on runs separated by unescaped
whitespace or parameters. A run can contain optional/choice groups. Each
branch must contain some nonempty literal text outside structural groups;
empty or exclusively optional branches are errors. This preserves Cucumber's
short-alternative boundaries. Inside parentheses all current-level slashes
belong to the enclosing choice, not bare alternatives.

### Optional groups

Consecutive optional groups are allowed, including groups whose parameters accept
the same input. Matching follows native JavaScript RegExp behavior: optional
groups are greedy, so the engine first attempts to match a group and may skip it
during backtracking if required for the complete expression to match. This is a
matching preference, not an unconditional rule that the first group always wins.

```text
Expression: I send( :message)( :recipient)
Input:      I send "Alice"
Positional: ["Alice", undefined]
Named:      params.message === "Alice"
            params.recipient === undefined
```

Parameter slots remain in expression-source order. Missing parameters retain
undefined values; their transformers are not called and their capture positions
are absent, including positions in child captures. Quotation marks delimit
parameter values but do not resolve which optional group a value belongs to.

Prefer distinguishing optional groups with literal text:

```text
Expression: I send( message :message)( to :recipient)
Input:      I send to "Alice"
Positional: [undefined, "Alice"]
Named:      params.message === undefined
            params.recipient === "Alice"
```

Backtracking can also skip an earlier group that initially accepts the value:

```text
Expression: I send( :message)( :recipient confirmed)
Input:      I send "Alice" confirmed
Positional: [undefined, "Alice"]
```

All whitespace remains literal; spaces are optional only when inside an optional
group. Do not reject consecutive optional groups merely because they could be
ambiguous. General ambiguity detection for arbitrary custom parameter regexes is
outside the initial scope.

### Formal grammar

EBNF below operates on original UTF-16 code units. Scanner predicates and the
semantic restrictions above are part of the grammar. `escaped` consumes two
code units (except that an escaped whitespace code unit is still just one
following the backslash). `ordinary` excludes reserved delimiters, backslash,
and a colon that starts `named`; inside braces `braceChar` additionally treats
colon as ordinary. All whitespace remains literal.

```ebnf
expression   = { parameter | whitespace | run } ;
run          = rootBranch, { "/", rootBranch } ;
rootBranch   = { rootLiteral | group } ;
group        = "(", sequence, { "/", sequence }, ")" ;
sequence     = { literal | parameter | group } ;
parameter    = named | braces ;
named        = ":", identifier, [ braces ] ;
braces       = "{", braceText, { "/", braceText }, "}" ;
braceText    = { braceChar | escaped } ;
identifier   = nameStart, { nameContinue } ;
literal      = ordinary | whitespace | escaped ;
rootLiteral  = ordinaryNonWhitespace | escaped ;
escaped      = "\\", escapable ;
nameStart    = "A"…"Z" | "a"…"z" | "_" | "$" ;
nameContinue = nameStart | "0"…"9" ;
```

`run` must consume at least one item and is maximal up to whitespace, a parameter, or end; a run with no slash is
just its sequence. Bare and grouped empty-branch checks are as defined above.
AST ranges include delimiters and escapes and use `[start,end)` in the original
expression. Errors expose `source`, `start`, `end` and include a readable offset.

## Runtime/API decisions

- Node >=22, ESM only, TypeScript ES2022; one package, no runtime dependencies.
- `new BddExpression(pattern, parameterTypeRegistry)` constructs an expression
  with `source`, `regexp`, `ast`, `match`, and `matchValues`. The registry is
  required, following the CucumberExpression constructor contract. Compilation
  and validation happen during construction. `createExpression(source, registry?)`
  remains a convenience factory returning a BddExpression, with built-ins by
  default. `parseExpression(source)` exposes the AST independently.
- `createParameterType({name, regexp, transformer?})` creates a structural type;
  `createParameterTypeRegistry()` supplies built-ins, `defineParameterType(type)`
  adds a type and rejects duplicate names. Default transformation returns the
  first immediate capture value. A registry with `lookupByTypeName(name)` can
  be passed directly, including an upstream Cucumber registry. Private upstream
  imports and constructor compatibility are not required.
- Built-ins ported from `@cucumber/cucumber-expressions@20.1.0`: `int`, `float`,
  `word`, `string`, anonymous ``, `double`, `bigdecimal`, `byte`, `short`, `long`,
  `biginteger`. Integer aliases use Number without range checks; biginteger uses
  BigInt; bigdecimal preserves text. Floats accept uppercase E, not lowercase e,
  and do not accept trailing decimal points. No locale or numeric inference.
- Inline choices use a synthetic parameter type named `inline-choice` with an
  identity transformation; variable names never replace type names. This name
  is reserved in our registry.
- Matching uses native `d` indices, without `i`, `m`, `s`, `u`, `v`, `g`, or `y`.
  It is case sensitive, matches the whole input and rejects an unconsumed final
  newline (also rejected by the verified Cucumber JavaScript implementation).
  An explicitly matched newline is allowed.
  Native ordered alternatives/backtracking apply; no longest-match heuristic.
  See [Optional groups](#optional-groups) for greedy matching and backtracking
  of consecutive optional groups containing parameters.
- Slots are assigned in source order, including parameters in every choice
  branch. Absent slots keep a Group with undefined value/start/end and the
  structural child tree, whose absent children also have undefined positions.
  Empty captures have `value: ''` and equal, defined start/end offsets.
- Arguments have `group`, `parameterType`, `getParameterType()`, and
  `getValue(world?)`. Group has `value`, `start`, `end`, `children` (undefined
  for leaves), and `values` (immediate child values, or its own singleton value).
  Nested descendants remain metadata; transformer arguments are immediate
  capture children, exactly as upstream. No `instanceof` compatibility is promised.
- `matchValues(text, world?)` always returns a Promise of `Values | null`.
  `Values` is an `unknown[]` with a nonenumerable `params` property containing a
  null-prototype name-to-value object. Names also retain positional slots.
  Matching occurs once; transformers run once per present argument, in source
  order, awaited sequentially (including PromiseLike results). Errors propagate.
  `getValue` returns the transformer result directly; repeated calls re-run it.
- Custom regexps may be strings, flagless RegExp objects, or nonempty arrays of
  either. Captures, noncapturing groups, lookarounds and named captures are
  supported. Named capture labels are erased during composition (the capture
  remains), so repeated types cannot cause duplicate native group-name errors.
  Backreferences (`\1` etc. and `\k<name>`) and legacy decimal/octal escapes
  outside character classes are rejected rather than silently renumbered.
  RegExp flags are rejected rather than discarded. Invalid regexps fail at
  registration (or expression compilation for external registries).
  Regex assertions still see the whole step, and quantified captures retain
  only their last native capture. Custom regexps are trusted application code;
  no timeout, ReDoS prevention, or ambiguity resolution is provided.

## Compatibility boundaries

Shared built-ins, quoted strings, simple optionals, bare choices, custom capture
transformation, and reporter fields are differentially tested against 20.1.0.
The new syntax, rejected malformed closing delimiters,
type-name restrictions, flag/backreference restrictions, and empty-choice rules
are intentional differences. Also, bare alternatives recognize all ECMAScript
whitespace as boundaries, while upstream 20.1.0 tokenizes only ASCII spaces as
whitespace; escapes of non-space whitespace are an extension. No automatic optional whitespace, cardinality,
ignored captures, arbitrary-text ambiguity resolution, framework parser adapter,
or cross-language compatibility is claimed. An unused argument remains metadata.

## Built-in pattern reference

These are JavaScript RegExp sources without flags. Each parameter is wrapped in
one additional capture by the compiler. The two integer sources are alternatives
`-?\d+` and `\d+`, preserving upstream's pattern structure.

| Types | Pattern / conversion |
| --- | --- |
| `int`, `byte`, `short`, `long` | Integer sources above; `Number(text)`, no bounds checks |
| `biginteger` | Integer sources above; `BigInt(text)` |
| `float`, `double` | `[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[E][+-]?\d+)?`; `parseFloat(text)` |
| `bigdecimal` | Same float pattern; return original text |
| `word` | `[^\s]+`; return original text |
| anonymous empty name | `.*`; return original text, empty allowed, greedy, no dotAll |

String source (presented separately because it contains a literal table separator):

```regex
"([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'
```

Its two immediate capture children represent the double-quoted and single-quoted
contents. Transformation chooses the first truthy content, then the second, then
`''`, replaces `\"` with `"` and `\'` with `'`, and leaves other backslashes
unchanged. This is not JSON or JavaScript escape decoding. Literal newlines
inside a quoted string can match the negated character class; a backslash
followed by a newline cannot match the `\\.` escape part. An absent *parameter*
is skipped before any builtin transformation.

The reporter contract was verified against the published playwright-bdd 9.2.1
source `src/steps/matchedStepDefinition.ts`. Its projection is recursive
`{start, value, children}` plus `parameterTypeName` from `argument.parameterType.name`.
JSON omits undefined fields; no values or positions are invented for absence.
This is verified serialization shape, not an end-to-end framework integration.
