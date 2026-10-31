# TypeScript API

Using BDD Expressions from TypeScript. See the [syntax guide](syntax.md) for expression language rules and examples.

## Usage

```ts
import { BddExpression } from 'bdd-expressions';

const expression = new BddExpression('I create :item( as :owner( in :workspace))', registry);
const result = (await expression.matchValues('I create "document" as "Alice"'))!;

console.log(result[0]); // 'document'
console.log(result[1]); // 'Alice'
console.log(result[2]); // undefined
console.log(result.params);
/*
{
  item: 'document',
  owner: 'Alice',
  workspace: undefined
}
*/
```

## Matching API

Use `matchValues(text, world?)` to get transformed values by position and by name:

```ts
const expression = new BddExpression('I buy :count{int} apples', registry);
const result = (await expression.matchValues('I buy 2 apples'))!;

console.log(result[0]); // 2
console.log(result.params); // { count: 2 }
```

The result is an array with a `params` property. `params` has a null prototype and
is nonenumerable. A failed match returns `null`.

Matching runs once. Transformers run once per present parameter in source order,
awaiting each result. The optional `world` argument supplies their context;
transformer errors propagate.

For integrations and reporters, use synchronous `match(text)` to inspect raw
captures without running transformers:

```ts
const expression = new BddExpression('I buy :count{int} apples', registry);
const args = expression.match('I buy 2 apples');
/*
[
  {
    parameterType: {
      name: 'int',
      regexpStrings: ['-?\\d+', '\\d+'],
      transform: [Function: transform]
    },
    group: {
      value: '2',
      start: 6,
      end: 7,
      children: undefined,
      values: [Getter] ['2']
    },
    getValue: [Function: getValue],
    getParameterType: [Function: getParameterType]
  }
]
*/
```

A successful match without parameters returns `[]`. Call `argument.getValue(world?)` to transform a capture;
repeated calls rerun its transformer.

Ranges are UTF-16 offsets with an inclusive start and exclusive end. Groups retain
raw text and child captures independently of transformed values. Leaves have
undefined `children`. Absent captures have undefined values and positions; empty
captures have `''` and equal start/end positions. Inline choices use the parameter
type name `inline-choice`.

The parameter type registry is required; use `createParameterTypeRegistry()` or
supply a Cucumber registry. Use `parseExpression(source)` to obtain the AST
independently. Parse errors include the expression source and source offsets.

## Named parameter inference

`new BddExpression(...)` automatically infers named values from an expression literal:

```ts
const expression = new BddExpression('I buy :count{int} apples( for :owner)', registry);
/*
Inferred params type:
{
  count: number;
  owner: string | undefined;
}
*/
```

Inference supports built-ins, inline choice unions, nested groups, alternatives,
and escaping. Parameters inside groups include `undefined`; positional values
remain `unknown`.

Custom parameter types default to `unknown`. Supply an explicit params type when
you know the transformer's result; it must match your registry.

To bound compiler cost, dynamic strings (including ordinary `String.raw` results)
and expressions longer than **256 TypeScript string characters** fall back to
`Record<string, unknown>`. Large literal unions also increase compiler work.
To disable parameter inference, explicitly pass `Record<string, unknown>`:

```ts
const expression = new BddExpression<Record<string, unknown>>(
  'I buy :count{int} apples( for :owner)',
  registry,
);
/*
Params type: Record<string, unknown>
*/
```

An explicit params type skips type-level expression parsing. You can also provide a
handwritten type such as `{ count: number; owner: string | undefined }` instead.
Runtime matching and parameter transformations are unchanged.

### Localization

Expression text and inline choice values may use any language:

```ts
const expression = new BddExpression('Compro :count{int} manzanas( para :owner)', registry);
/*
Inferred params type:
{
  count: number;
  owner: string | undefined;
}
*/
```

Localization restrictions:

- Parameter names follow `[A-Za-z_$][A-Za-z0-9_$]*`; registered type names additionally
  allow `.` and `-` after the first character. For example, `:café` means parameter
  `caf` followed by literal `é`, while `:árbol` is entirely literal text.
- Syntax uses ASCII `:`, `{}`, `()`, and `/`. Fullwidth variants are literal text.
- Built-in numeric types use ASCII digits and a decimal point, not localized digits
  or decimal commas. Default string parameters require ASCII single or double quotes.
  Custom parameter types can support localized value formats.
- Matching does not normalize Unicode: composed and decomposed accents remain distinct.
- The 256-character inference limit still applies. Combining marks and joined emoji
  can consume multiple characters even when displayed as one symbol.

Inference assumes valid syntax and does not model correlations between alternative
branches.

## Custom parameter types

Custom types are plain structural objects produced by a factory:

```ts
import { createParameterType } from 'bdd-expressions';
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
const result = (await point.matchValues('Move to 3,-2'))!;

console.log(result[0]);
/*
{
  x: 3,
  y: -2
}
*/
console.log(result.params);
/*
{
  point: {
    x: 3,
    y: -2
  }
}
*/
```

Use a regular function to access `this` from the `world` argument. Transformers may return asynchronous or PromiseLike results. A type with capture groups receives its immediate child capture values; deeper groups remain available in metadata. Without a transformer, the type returns the first immediate capture value.

Custom patterns may be strings, flagless RegExp objects, or nonempty arrays of either. Captures, noncapturing groups, lookarounds, and named captures are supported. Native capture labels are removed during compilation while preserving their capture structure. Flags, backreferences, and legacy numeric escapes outside character classes are rejected. Type names use ASCII letters, digits, `_`, `$`, `.`, and `-`, starting with a letter, `_`, or `$`; duplicate registrations are rejected.

An existing Cucumber registry can be passed directly if it exposes `lookupByTypeName(name)`. There is no runtime import of Cucumber.

## Escaping in string literals

JavaScript string literals add their own escaping layer. `String.raw` lets you write expression escapes directly:

```ts
import { BddExpression } from 'bdd-expressions';

const url = new BddExpression(String.raw`Visit https:\/\/example.com label\:value`, registry);
url.match('Visit https://example.com label:value');
/*
[]
*/
```
