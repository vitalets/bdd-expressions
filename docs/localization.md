# Localization

Expression text and inline choice values may use any language:

```ts
import { BddExpression, createParameterTypeRegistry } from 'bdd-expressions';

const registry = createParameterTypeRegistry();
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
- Syntax uses ASCII `:`, `{}`, `()`, `[]`, and `/`. Fullwidth variants are literal text.
- Built-in numeric types use ASCII digits and a decimal point, not localized digits
  or decimal commas. Default string parameters require ASCII single or double quotes.
  Custom parameter types can support localized value formats.
- Matching does not normalize Unicode: composed and decomposed accents remain distinct.
- The 256-character inference limit still applies. Combining marks and joined emoji
  can consume multiple characters even when displayed as one symbol.

See [named parameter inference](api.md#named-parameter-inference) for inference rules and [custom parameter types](api.md#custom-parameter-types) for localized value formats.
