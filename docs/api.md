# TypeScript API

Using BDD Expressions from TypeScript. See the [syntax guide](syntax.md) for expression language rules and examples.

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

## Matching API

`new BddExpression(pattern, parameterTypeRegistry)` exposes `source`, `regexp`, `ast`, `match`, and `matchValues`. Use `BddExpression` as the TypeScript instance type as well. The registry is required and can be created with `createParameterTypeRegistry()` or supplied by Cucumber. Use `parseExpression(source)` to obtain the AST independently. Parse errors include the expression source and source offsets.

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

## Escaping in string literals

JavaScript string literals add their own escaping layer. `String.raw` lets you write expression escapes directly:

```ts
import { BddExpression, createParameterTypeRegistry } from 'bdd-expressions';

const url = new BddExpression(
  String.raw`Visit https:\/\/example.com label\:value`,
  createParameterTypeRegistry(),
);
url.match('Visit https://example.com label:value'); // []
```
