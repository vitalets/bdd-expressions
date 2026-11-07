# TypeScript API

Using BDD Expressions from TypeScript. See the [syntax guide](syntax.md) for expression language rules and examples.

## Usage

```ts
import { BddExpression, createParameterTypeRegistry } from 'bdd-expressions';

const registry = createParameterTypeRegistry();
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

## BddExpression

### `new BddExpression(pattern, parameterTypeRegistry)`

Parses and compiles an expression for repeated matching. Invalid syntax, unknown parameter types, and invalid parameter placement throw during construction.

| Parameter               | Type                           | Description                                                                                        |
| ----------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `pattern`               | `string`                       | Expression source. Literal strings enable named parameter inference.                               |
| `parameterTypeRegistry` | `ParameterTypeRegistry<Table>` | Required registry created with `createParameterTypeRegistry()`, or a compatible Cucumber registry. |

```ts
const expression = new BddExpression('I buy :count{int} apples', registry);
```

The `Table` generic is inferred from the registry. See [named parameter inference](#named-parameter-inference) for explicit parameter types.

### Properties

| Property       | Type      | Description                                                                                         |
| -------------- | --------- | --------------------------------------------------------------------------------------------------- |
| `source`       | `string`  | Original expression source.                                                                         |
| `ast`          | `Node`    | Parsed expression tree.                                                                             |
| `regexp`       | `RegExp`  | Compiled variant without supplied step arguments. Use `match()` to validate step argument presence. |
| `hasDocString` | `boolean` | Whether the expression declares a DocString parameter.                                              |
| `hasDataTable` | `boolean` | Whether the expression declares a DataTable parameter.                                              |

All properties are readonly. See [DocString and DataTable](docstring-datatable.md) for declaration flags, matching rules, and runner integration.

### `matchAndResolve(text, options?)`

Matches the whole step text and transforms the captured parameters.

| Parameter           | Type                                         | Description                             |
| ------------------- | -------------------------------------------- | --------------------------------------- |
| `text`              | `string`                                     | Step text to match.                     |
| `options`           | `StepArguments<Table> & { world?: unknown }` | Optional settings; defaults to `{}`.    |
| `options.world`     | `unknown`                                    | Transformer `this` context.             |
| `options.docString` | `string`                                     | Optional separately supplied DocString. |
| `options.dataTable` | `Table`                                      | Optional separately supplied DataTable. |

**Returns:** `Promise<BddExpressionResult<Values, Table, Source> | null>`. A failed match returns `null`.

```ts
const expression = new BddExpression('I buy :count{int} apples', registry);
const result = await expression.matchAndResolve('I buy 2 apples');

if (result) {
  console.log(result[0]); // 2
  console.log(result.params); // { count: 2 }
}
```

The result is an array of transformed values in expression order with readonly,
nonenumerable `params`, `docString`, and `dataTable` properties. `params` has a null
prototype and contains transformed named values. The step argument properties retain
the original supplied values; see [DocString and DataTable](docstring-datatable.md)
for their types and transformations.

Matching runs once. Transformers are invoked once per present parameter in source
order, and their results are awaited concurrently with `Promise.all`, matching
Cucumber.js. Positional values retain expression order regardless of completion
order. The optional `world` argument supplies transformer context. Errors propagate:
a synchronous throw stops further invocations, while an asynchronous rejection
does not cancel transformers already started.

### `match(text, stepArguments?)`

Synchronously matches the whole step text and returns raw arguments without running transformers. Useful for integrations and reporters.

| Parameter       | Type                   | Description                                                                                                           |
| --------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `text`          | `string`               | Step text to match.                                                                                                   |
| `stepArguments` | `StepArguments<Table>` | Optional `docString` and `dataTable` inputs; defaults to `{}`. See [DocString and DataTable](docstring-datatable.md). |

**Returns:** `readonly Argument[] | null`. A failed match returns `null`; a successful match without parameters returns `[]`.

```ts
const expression = new BddExpression('I buy :count{int} apples', registry);
const args = expression.match('I buy 2 apples');

if (args) {
  console.log(args[0]!.name); // 'count'
  console.log(args[0]!.group.value); // '2'
  console.log(args[0]!.group.start); // 6
  console.log(args[0]!.group.end); // 7
  console.log(args[0]!.getValue()); // 2
}
```

## Argument

### Properties

| Property        | Type            | Description                                      |
| --------------- | --------------- | ------------------------------------------------ |
| `name`          | `string         | undefined`                                       | Expression binding name, or `undefined` for unnamed parameters. |
| `parameterType` | `ParameterType` | Type used to resolve this argument.              |
| `group`         | `Group`         | Raw capture text, positions, and child captures. |

These properties are TypeScript-readonly. Names remain available for absent optional parameters and unselected choice branches.

Ranges are UTF-16 offsets with an inclusive start and exclusive end. Groups retain
raw text and child captures independently of transformed values. Leaves have
undefined `children`. Absent captures have undefined values and positions; empty
captures have `''` and equal start/end positions. Inline choices use the parameter
type name `inline-choice`.

### `getValue(world?)`

Transforms the captured value. Repeated calls rerun the transformer. Absent optional parameters return `undefined` without running a transformer.

| Parameter | Type      | Description                          |
| --------- | --------- | ------------------------------------ |
| `world`   | `unknown` | Optional transformer `this` context. |

**Returns:** `unknown`, which may be a PromiseLike value when the transformer is asynchronous.

```ts
const args = expression.match('I buy 2 apples');
const value = await args?.[0]?.getValue(); // 2
```

### `getParameterType()`

Returns the argument's `ParameterType`, the same object exposed by `parameterType`. Takes no parameters.

```ts
const args = expression.match('I buy 2 apples');
console.log(args?.[0]?.getParameterType().name); // 'int'
```

## `createParameterTypeRegistry<Table>()`

Creates a mutable registry populated with built-in parameter types. Takes no runtime parameters. The optional `Table` generic describes supplied table values; see [DocString and DataTable](docstring-datatable.md).

**Returns:** `MutableParameterTypeRegistry<Table>`.

```ts
import { createParameterTypeRegistry } from 'bdd-expressions';

const registry = createParameterTypeRegistry();
```

## Custom parameter types

### `registry.defineParameterType(optionsOrType)`

Registers a custom parameter type. Returns `void`; invalid definitions and duplicate registrations throw.

| Parameter             | Type                                              | Description                                                             |
| --------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| `optionsOrType`       | `ParameterTypeOptions` or `ParameterType`         | Type options or an already-created parameter type.                      |
| `options.name`        | `string`                                          | Unique registered type name.                                            |
| `options.regexp`      | `string`, `RegExp`, or a readonly array of either | Required text pattern(s); arrays must be nonempty and regexps flagless. |
| `options.transformer` | function                                          | Optional capture transformer; may return a PromiseLike value.           |

For step argument options, see [custom DocString and DataTable types](docstring-datatable.md#custom-docstring-and-datatable-types).

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

### `registry.lookupByTypeName(name)`

Looks up a registered parameter type without transforming any values.

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `name`    | `string` | Registered type name. |

**Returns:** `ParameterType<unknown, Table> | undefined`.

```ts
const intType = registry.lookupByTypeName('int');
console.log(intType?.name); // 'int'
```

## `createParameterType(options)`

Creates and validates a parameter type without registering it. Accepts the same options as `registry.defineParameterType()`.

| Parameter | Type                   | Description                                                               |
| --------- | ---------------------- | ------------------------------------------------------------------------- |
| `options` | `ParameterTypeOptions` | Type name, input pattern or step argument flag, and optional transformer. |

**Returns:** `TextParameterType`, `DocStringParameterType`, or `DataTableParameterType`, depending on the options.

```ts
import { createParameterType } from 'bdd-expressions';

const color = createParameterType({ name: 'Color', regexp: /red|green|blue/ });
registry.defineParameterType(color);
```

## `parseExpression(source)`

Parses syntax independently of a registry, without resolving registered parameter types.

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `source`  | `string` | Expression source to parse. |

**Returns:** `Node`, an AST with UTF-16 source ranges (`start` inclusive, `end` exclusive).

**Throws:** `ExpressionError` for invalid syntax. The error exposes `source`, `start`, and `end`; its message includes the source and error offset.

```ts
import { parseExpression } from 'bdd-expressions';

const ast = parseExpression('I buy :count{int} apples');
console.log(ast.kind); // 'sequence'
```

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

Single-branch required groups preserve required parameter types: `[:count{int}]` infers `{ count: number }`. Parameters in optional groups or unselected choice branches include `undefined`: `[:count{int}/none]` infers `{ count: number | undefined }`.

Inference assumes valid syntax and does not model correlations between alternative
branches.

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

## Related guides

- [Expression syntax](syntax.md)
- [DocString and DataTable](docstring-datatable.md)
- [Localization](localization.md)
