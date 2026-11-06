# TypeScript API

Using BDD Expressions from TypeScript. See the [syntax guide](syntax.md) for expression language rules and examples.

## Usage

```ts
import { BddExpression } from 'bdd-expressions';

const expression = new BddExpression('I create :item( as :owner( in :workspace))', registry);
const result = (await expression.matchAndResolve('I create "document" as "Alice"'))!;

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

Use `matchAndResolve(text, options?)` to get transformed values by position and by name. The optional options object accepts `world` as the transformer context and `docString` and `dataTable` as step arguments:

```ts
const expression = new BddExpression('I buy :count{int} apples', registry);
const result = (await expression.matchAndResolve('I buy 2 apples'))!;

console.log(result[0]); // 2
console.log(result.params); // { count: 2 }
```

The result has type `BddExpressionResult<Params, Table, Source>`: an array with readonly,
nonenumerable `params`, `docString`, and `dataTable` properties. `params` has a null
prototype and contains transformed named values. `docString` and `dataTable` contain
the original step argument values, before transformation, or `undefined` when absent.
A failed match returns `null`.

Matching runs once. Transformers are invoked once per present parameter in source
order, and their results are awaited concurrently with `Promise.all`, matching
Cucumber.js. Positional values retain expression order regardless of completion
order. The optional `world` argument supplies transformer context. Errors propagate:
a synchronous throw stops further invocations, while an asynchronous rejection
does not cancel transformers already started.

For integrations and reporters, use synchronous `match(text)` to inspect raw
captures without running transformers:

```ts
const expression = new BddExpression('I buy :count{int} apples', registry);
const args = expression.match('I buy 2 apples');
/*
[
  {
    name: 'count',
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

`match()` returns `readonly Argument[] | null`. Each argument exposes a
TypeScript-readonly `name?: string`: the expression binding name (`count` above),
or `undefined` for unnamed parameters. Names remain available for absent optional
parameters and unselected choice branches.

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

> [!IMPORTANT]
> `String.raw` breaks automatic named parameter type inference: its result has type `string` rather than a string literal type, so named parameters fall back to `Record<string, unknown>`.

To bound compiler cost, dynamic strings
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

Define custom parameter types by passing options directly to the registry:

```ts
registry.defineParameterType({
  name: 'Point',
  regexp: /(-?\d+),(-?\d+)/,
  transformer(x, y) {
    return { x: Number(x), y: Number(y) };
  },
});

const point = new BddExpression('Move to :point{Point}', registry);
const result = (await point.matchAndResolve('Move to 3,-2'))!;

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

For compatibility, `defineParameterType()` also accepts already-created parameter-type objects, including objects returned by the exported `createParameterType()` factory. Direct options are the usual registration API.

Custom patterns may be strings, flagless RegExp objects, or nonempty arrays of either. Captures, noncapturing groups, lookarounds, and named captures are supported. Native capture labels are removed during compilation while preserving their capture structure. Flags, backreferences, and legacy numeric escapes outside character classes are rejected. Type names use ASCII letters, digits, `_`, `$`, `.`, and `-`, starting with a letter, `_`, or `$`; duplicate registrations are rejected.

An existing Cucumber registry can be passed directly if it exposes `lookupByTypeName(name)`. There is no runtime import of Cucumber.

## Escaping in string literals

JavaScript string literals add their own escaping layer, including ordinary backtick template literals. Use `\\:` to pass `\:` to the expression parser; writing `\:` in an ordinary string or template literal loses the backslash.

```ts
'label\\:value'; // Single-quoted string
`label\\:value`; // Ordinary template literal
```

Both produce the expression text `label\:value`, which matches literal `label:value`.

```ts
import { BddExpression } from 'bdd-expressions';

const url = new BddExpression('Visit https:\\/\\/example.com label\\:value', registry);
url.match('Visit https://example.com label:value');
/*
[]
*/
```

## DocString and DataTable types

`{DocString}` and `{DataTable}` are built in. Pass their values separately from the step text; they are returned unchanged by default.

```ts
const registry = createParameterTypeRegistry();
const expression = new BddExpression('I send(::body{DocString})', registry);

const result = await expression.matchAndResolve('I send:', {
  docString: 'Hello',
});
console.log(result!.params.body); // 'Hello'
console.log(result!.docString); // 'Hello' (type: string | undefined)
```

Use `match(text, { docString, dataTable })` for raw arguments, or `matchAndResolve(text, { world, docString, dataTable })` for resolved values. Both step arguments can be supplied together. Missing optional values resolve to `undefined`; an empty DocString counts as present. Missing required values or unexpected supplied values prevent matching.

The default table type supports `hashes()`, `raw()`, `rows()`, `rowsHash()`, and `transpose()`. Supply your runner's table instance. For another representation, override the generic—for example, `createParameterTypeRegistry<string[][]>()`.

On a successful result, required built-in step arguments exclude `undefined` from
their property types; step arguments inside groups include it:

```ts
const registry = createParameterTypeRegistry<string[][]>();
const expression = new BddExpression('I create{DataTable}(:{DocString})', registry);
const result = await expression.matchAndResolve('I create', {
  dataTable: [['Alice']],
});

if (result) {
  result.dataTable; // string[][]
  result.docString; // string | undefined
}
```

Step argument presence inference uses expression literals up to 256 TypeScript string
characters. Dynamic or longer expressions, and custom step argument type names, retain
`undefined` in the property types. Supplying only an explicit `Params` generic also
defaults `Source` to `string`, so step argument properties retain `undefined`.

### Custom DocString and DataTable types

Set one flag and omit `regexp`. Transformers are optional; table inputs infer from the registry generic and DocString inputs are strings.

```ts
registry.defineParameterType({
  name: 'UsersDataTable',
  dataTable: true,
  transformer: (table) => table.hashes(),
});

registry.defineParameterType({
  name: 'JsonDocString',
  docString: true,
  transformer: (text) => JSON.parse(text),
});
```

Use custom types by name: `I create users(::users{UsersDataTable})`. The first colon is literal; the second names the parameter. Custom result types default to `unknown`; see [named parameter inference](#named-parameter-inference) for explicit types. Transformers do not run for absent optional values.

Transformers affect positional values and `result.params`, but not the original
step arguments: for `UsersDataTable` above, `result.params.users` contains the hashes,
while `result.dataTable` retains the supplied table instance. Likewise,
`result.docString` retains the original string when using `JsonDocString`.

DocString and DataTable arguments have no text positions in `group`. Use `match()` rather than the public `regexp` to check their presence. See the [syntax rules](syntax.md#docstring-and-datatable-types) for placement and optionality.
