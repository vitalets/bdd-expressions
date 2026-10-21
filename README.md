# bdd-expressions

Expressive syntax for BDD step definitions. Inspired by [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions).

Capture named values, nest optional phrases, and choose between multiword alternatives while keeping step definitions readable.

## Features

- **Named and positional parameters:** access the same value by index or through `values.params`.
- **Flexible optional phrases:** put parameters inside optional groups, nest groups, or use consecutive groups.
- **Readable alternatives:** choose between words or whole phrases, optionally capturing the selected text without registering a type.
- **Familiar parameter types:** all 11 Cucumber JavaScript built-ins, plus custom types and support for existing Cucumber registries.
- **Async transformations:** await custom transformers and pass a world object as their `this` context.
- **Capture metadata:** preserve raw text, nested captures, and native match positions for integrations and reporters.
- **Zero runtime dependencies:** an ESM JavaScript/TypeScript package for Node.js 22 and later.

## Usage

```ts
import { BddExpression, createParameterTypeRegistry } from 'bdd-expressions';

const expression = new BddExpression(
  'I create :item( as :owner( in :workspace))',
  createParameterTypeRegistry(),
);
const values = await expression.matchValues('I create "document" as "Alice"');

values?.[0]; // 'document'
values?.params.owner; // 'Alice'
values?.params.workspace; // undefined (its positional slot is retained)
```

## Syntax

See the [syntax guide](docs/syntax.md) for parameters, built-in types, optional groups, alternatives, and escaping, with examples.

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
| Inline choice                          | `{pending/approved}` or `:status{pending/approved}`                  | Requires a registered custom type                                               |
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

## Custom parameter types

Custom types are plain structural objects produced by a factory:

```ts
import { BddExpression, createParameterType, createParameterTypeRegistry } from 'bdd-expressions';

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

const point = new BddExpression('Move to :point{Point}', registry);
const result = await point.matchValues('Move to 3,-2');
result?.params.point; // { x: 3, y: -2 }
```

Use a regular function to access `this` from the `world` argument. Transformers may return asynchronous or PromiseLike results. A type with capture groups receives its immediate child capture values; deeper groups remain available in metadata. Without a transformer, the type returns the first immediate capture value.

Custom patterns may be strings, flagless RegExp objects, or nonempty arrays of either. Captures, noncapturing groups, lookarounds, and named captures are supported. Native capture labels are removed during compilation while preserving their capture structure. Flags, backreferences, and legacy numeric escapes outside character classes are rejected. Type names use ASCII letters, digits, `_`, `$`, `.`, and `-`, starting with a letter, `_`, or `$`; duplicate registrations are rejected.

An existing Cucumber registry can be passed directly if it exposes `lookupByTypeName(name)`. There is no runtime import of Cucumber.

## Matching API

`new BddExpression(pattern, parameterTypeRegistry)` exposes `source`, `regexp`, `ast`, `match`, and `matchValues`. The registry is required and can be created with `createParameterTypeRegistry()` or supplied by Cucumber. The existing `createExpression(source, registry?)` factory remains available and returns a `BddExpression`. Use `parseExpression(source)` to obtain the AST independently. Parse errors include the expression source and source offsets.

`matchValues(text, world?)` returns a Promise of a positional array with a `params` object, or `null` on no match. Named parameters are positional arguments too. Matching runs once, and transformers run once per present parameter in source order, awaiting each result. Transformer errors propagate. `params` has a null prototype and is nonenumerable on the array.

For integrations and reporters, `match(text)` is synchronous and returns `readonly Argument[] | null`; it never runs transformers. A successful match with no parameters returns `[]`.

```ts
const expression = new BddExpression('😀 :count{int}', createParameterTypeRegistry());
const argument = expression.match('😀 002')![0]!;
argument.group.value; // '002'
argument.group.start; // 3
argument.group.end; // 6
argument.getValue(); // 2
argument.getParameterType().name; // 'int'
```

Ranges are UTF-16, half-open offsets in the input. Groups retain raw text and child captures independently of transformed values. Leaves have undefined `children`. Absent slots have undefined value and positions; an empty capture has `''` and defined, equal start/end positions. Inline choices have type name `inline-choice`, regardless of their variable name. Calling `getValue(world?)` directly returns the transformer's result; repeated calls rerun it.

## Project documentation

- [Syntax guide](docs/syntax.md): usage examples for every syntax form.
- [Specification](docs/specification.md): complete language rules, grammar, matching behavior, and API contracts. The resolved normative section takes precedence over the preserved original brief.
- [Implementation plan](docs/implementation-plan.md): completed stages, verification, and remaining scope.
- [Decisions](docs/decisions.md): design rationale, compatibility provenance, and intentional limitations.
