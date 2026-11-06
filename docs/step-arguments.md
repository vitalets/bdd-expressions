---
status: accepted
---

# DocString and DataTable matching

Internal design decision; not included in the website. Match separately supplied DocString and DataTable values using text-only regexp variants. This preserves optional grouping without exposing these values to text patterns.

## Why variants

In `I create a user(:{DataTable})`, the colon and table belong to the same optional group. Without a table, the title must end in `user`; with a table, it must end in `user:`. Replacing `{DataTable}` with an empty pattern while leaving the group optional would lose that relationship.

The compiler selects among four presence combinations. For `I create a user(:{DataTable})(:{DocString})`:

| Inputs         | Simplified regexp         |
| -------------- | ------------------------- |
| Neither        | `^I create a user$`       |
| Table only     | `^I create a user:()$`    |
| DocString only | `^I create a user:()$`    |
| Both           | `^I create a user:():()$` |

Independent text optionals remain optional. For example, `I create a user(:)({DataTable})` accepts either spelling with or without a table.

## Compilation and resolution

1. Parse normally, then look up parameter types to identify `dataTable: true` and `docString: true` nodes.
2. Validate trailing placement and determine each subtree's allowed presence combinations.
3. Compile four variants. A present DocString or DataTable parameter becomes `()`, consuming no title characters. Its optional group becomes required when needed.
4. Select the variant from supplied inputs and match only the original title.
5. Resolve text captures and supplied values into arguments in expression order.

The actual regexps preserve capture slots in disabled branches using impossible captures such as `((?!))`. This keeps argument positions stable. Names remain metadata. Absent optional values resolve to `undefined` without running transformers; present values pass through unchanged unless transformed.

All supplied values must be consumed by the selected branch. Required missing values make matching fail. `undefined` means absent; an empty DocString is present. The implementation builds variants eagerly; some have identical text patterns or cannot match.

## API boundaries

Register all custom types through `registry.defineParameterType(options)`. Flags identify the input kind; names do not. The internal parameter-type union has separate text, DataTable, and DocString variants. Each exposes one `transform` method accepting its own input; only text types carry regexp fields. Use descriptive custom names such as `UsersDataTable`.

The default registry includes identity `{DataTable}` and `{DocString}` types. The table generic defaults to an internal structural type with `hashes`, `raw`, `rows`, `rowsHash`, and `transpose`. Integrations may override it to keep transformer inputs and matching inputs consistent. No runtime table class or Gherkin parser is required.

DocString and DataTable parameters must be last, with at most one of each kind per expression. Colons and whitespace may introduce another parameter, but cannot trail the final one. Runners supply the parsed values and must not append them again after expression resolution.

## Alternatives rejected

- **Synthetic markers:** broad custom patterns such as `[\s\S]*` can capture them. Newline delimiters do not protect against arbitrary regexps.
- **One regexp plus validation:** rejecting a completed match does not trigger backtracking to another valid capture allocation. Variants enforce requirements during matching.
- **Step options alone:** cannot express the relationship between optional punctuation and DocString or DataTable parameters.

Implementation: [presence analysis](../src/step-arguments.ts), [compiler](../src/compiler.ts), [registry](../src/parameter-types/registry.ts), and [tests](../test/step-arguments.spec.ts).
