# bdd-expressions

A JavaScript/TypeScript expression language for BDD step definitions.

- [Specification](docs/specification.md)
- [Implementation plan and progress](docs/implementation-plan.md)
- [Architecture and language decisions](docs/decisions.md)

Requires Node.js 22 or newer. ESM only; no runtime dependencies.

```ts
import { createExpression } from 'bdd-expressions';

const expression = createExpression('I create :item( as :owner( in :workspace))');
const values = await expression.matchValues('I create "document" as "Alice"');

values?.[0]; // 'document'
values?.params.owner; // 'Alice'
values?.params.workspace; // undefined (its positional slot is retained)
```

`matchValues(text, world?)` returns a Promise of an array with a `params` object,
or `null` on no match. Names are also positional arguments. Transformers run once
per present parameter, in source order; async and PromiseLike results are awaited.
`params` has a null prototype and is nonenumerable on the array.

Common forms:

| Expression                                | Matches                                         |
| ----------------------------------------- | ----------------------------------------------- |
| `I have :count{int} cucumber(s)`          | `I have 2 cucumbers`                            |
| `I open :page`                            | `I open "Settings"` or `I open 'Settings'`      |
| `I (click/tap on/press and hold) :target` | `I tap on "Save"`                               |
| `:status{pending/approved/rejected}`      | `approved`, captured as text                    |
| `I open :page(/ again/ once more)`        | `I open "Settings" once more`                   |
| `belly/stomach`                           | `belly` or `stomach`, with no captured argument |

Whitespace is literal. Put an optional space **inside** its group. Parentheses
without a slash make an optional group; with a current-level slash they make a
choice. Only the first branch of a structural choice may be empty. Inline
captured choices require nonempty branches.

Untyped names require quoted input, just like `{string}`. Quotes explicitly in
the expression are literal: `":page"` requires the extra literal quotes too.
`{page}` looks up a type named `page`; it never means a named parameter.

Built-ins: `{int}`, `{float}`, `{word}`, `{string}`, `{double}`, `{bigdecimal}`,
`{byte}`, `{short}`, `{long}`, `{biginteger}`, and `{}`. The last is greedy
arbitrary text, permits empty input, and can produce ambiguous boundaries.
There is no automatic number inference.

Names use ASCII letters, digits, `_`, and `$`, and cannot start with a digit.
Duplicate names are errors even across branches. An unescaped colon before a
name starts a parameter; escape literal colons and slashes where needed:

```ts
const url = createExpression(String.raw`Visit https:\/\/example.com label\:value`);
url.match('Visit https://example.com label:value'); // []
```

Custom types are plain structural objects produced by a factory:

```ts
import {
  createExpression,
  createParameterType,
  createParameterTypeRegistry,
} from 'bdd-expressions';

const registry = createParameterTypeRegistry();
registry.defineParameterType(
  createParameterType({
    name: 'Point',
    regexp: /(-?\d+),(-?\d+)/,
    transformer(x, y) {
      return { x: Number(x), y: Number(y) };
    },
  }),
);

const point = createExpression('Move to :point{Point}', registry);
const result = await point.matchValues('Move to 3,-2');
result?.params.point; // { x: 3, y: -2 }
```

Use a regular function to access `this` from the `world` argument. A type with
capture groups receives its immediate child capture values; deeper groups are
retained in metadata. An absent optional parameter never invokes its transformer.
Regexps must be flagless; backreferences and legacy numeric escapes outside
character classes are rejected. Named captures work and keep their capture
structure, but their native labels are removed during compilation.

An existing Cucumber registry can be passed directly if it exposes
`lookupByTypeName(name)`. There is no runtime import of Cucumber.

For integrations and reporters, `match(text)` is synchronous and returns
`readonly Argument[] | null`; it never runs transformers:

```ts
const expression = createExpression('😀 :count{int}');
const argument = expression.match('😀 002')![0]!;
argument.group.value; // '002'
argument.group.start; // 3
argument.group.end; // 6
argument.getValue(); // 2
argument.getParameterType().name; // 'int'
```

Ranges are UTF-16, half-open offsets in the input. Groups retain raw text and
child captures independently of transformed values. Leaves have undefined
`children`. Absent slots have undefined value and positions; an empty capture has
`''` and defined, equal start/end positions. Inline choices have type name
`inline-choice`, regardless of their variable name.

The field projection used by **playwright-bdd 9.2.1**
(`group.start/value/children` and `parameterTypeName`) is tested. This is a
reporting contract, not a claim that the package replaces a framework's parser
without an adapter or passes Cucumber `instanceof` checks.

Intentional extensions include names, parameters inside optionals, nested
optionals, captured choices, and multiword structural choices. New reserved
syntax and stricter malformed-delimiter handling can conflict with old literal
Cucumber text. See the specification for exact compatibility boundaries.

This library does not provide automatic optional whitespace, lists/cardinality,
ignored captures, a snippet generator, an editor extension, regex timeouts, or
resolution of ambiguous custom regexps/free text.

Development:

```sh
npm ci
npm run check         # format, lint, type-check, build, and test
npm run fmt:write     # format with Oxfmt
npm run lint:fix      # apply Oxlint fixes
```

Development and CI use Node 24; tests use Node's native TypeScript support.
CI runs on Ubuntu 24.04. The package runtime minimum remains Node 22.
The root TypeScript config checks source and tests; `tsconfig.build.json` emits
ESM, declarations, and source maps after cleaning `dist`. Source files are
included in the npm package for navigation from those maps.

`npm install` configures the Git hooks through the `prepare` task. To configure
them again, run `npm run prepare` from the Git repository. The pre-commit
hook runs lint-staged; pre-push runs `npm run check`. Set `SKIP_GIT_HOOKS=1` to
skip them for an individual command.

The manual release workflow is copied unchanged from playwright-webext. Its
`prettier` and `tsc` script names are compatibility aliases for Oxfmt checks and
TypeScript checking.
Publishing requires the destination GitHub repository and npm trusted publisher
configuration; adding this workflow does not publish anything.

Built-ins and capture contracts derive from Cucumber Expressions 20.1.0; see
[third-party notices](THIRD_PARTY_NOTICES.md). Differential tests use Cucumber
only as a development dependency.
