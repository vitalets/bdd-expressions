# Implementation plan

The authoritative requirements and language definition are in
[specification.md](specification.md). The original supplied requirements were
persisted in full before implementation.

Each stage must have observable verification before completion:

1. Build and test infrastructure: package builds and TypeScript tests run.
2. Lexical rules: resolve names, colons, escapes, empty branches, and anchoring;
   record grammar and decisions.
3. AST/parser: source locations and positioned errors, tested with nesting.
4. Registry: port verified upstream built-ins and test transformations.
5. Compiler/matching: whole-input native indices and stable argument slots.
6. Metadata: verify nested capture trees and upstream argument contracts.
7. Values: positional values, safe named access, async/world/absent behavior.
8. Differential tests: shared language subset, values and metadata.
9. Reporter contract: inspect actual integration code and test serialization.
10. Documentation: executable README examples and final check.

## Progress

Completed on 2026-10-20:

| Stage                  | Outcome / verification                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1. Infrastructure      | ESM package, declarations, lockfile, node:test via tsx; build and type checks pass                              |
| 2. Lexical rules       | Normative syntax table, grammar, empty branches, names, escapes, colons, regex limits recorded                  |
| 3. AST/parser          | Recursive descent, original UTF-16 spans, nesting-aware choices, positioned errors; first 17 tests passed       |
| 4. Registry            | All 11 upstream built-ins, custom factories, structural registry support, MIT notices; 19 tests passed          |
| 5. Compiler/matching   | Native d-flag indices, whole-input matching, stable source-order slots                                          |
| 6. Metadata            | Nested capture trees, undefined absent captures, immediate-child transformation, raw ranges                     |
| 7. Values              | Async matchValues, world/PromiseLike support, absent-transform skipping, null-prototype params; 30 tests passed |
| 8. Differential checks | Pinned Cucumber 20.1.0 oracle; numeric/string matrix, alternatives, custom groups, world and registry adapter   |
| 9. Reporter contract   | Inspected playwright-bdd 9.2.1 package source; tests verify its field projection, including absent/empty groups |
| 10. Documentation      | README examples have executable tests; final suite: 47 tests on Node 22 and Node 24                             |

Final verification:

- `npm run check`: build, source/test type checks, all 47 tests passed on Node 24.
- `npm exec --yes --package=node@22 -- node --import tsx --test test/*.spec.ts`:
  all 47 tests passed on the minimum supported Node major.
- `npm pack --dry-run --json --cache /tmp/bdd-expressions-npm-cache`: passed;
  includes compiled ESM/declarations, documentation, README, and license notices,
  with no bundled dependencies. A temporary cache avoids the sandbox's
  restriction on writes to the user's default npm cache.
- CI configured for Node 22/24; hosted CI has not been run in this session.
- Public package self-import smoke test passed against built `dist` exports;
  `npm ls --omit=dev` confirmed zero runtime dependencies.

## Remaining work

Consecutive optional groups are specified explicitly and covered by regression
tests for neither, first only, literal-distinguished second only, both, ambiguous
first-group preference, and backtracking that skips the earlier group. These also
verify source-order named/positional values, absent capture positions, and skipped
absent transformers. The existing native RegExp implementation needs no change.

No required first-version implementation stages remain. No publishing or
external release was performed.

Intentional limitations/future work (not incomplete acceptance criteria):

- Framework parser-selection adapters and Cucumber class/instanceof compatibility.
- Regex backreferences/flags, arbitrary-text ambiguity resolution, regex timeouts.
- Compile-time inference from expression literals, CJS, other languages.
- Cardinality/lists, snippet generation, editor/LSP support, ignored-capture syntax.

These require a separate scope decision. See the specification for exact behavior.

## Infrastructure follow-up

Tests now run directly with Node 24's native TypeScript support; the tsx
dependency has been removed. Earlier verification commands above are historical.

Applied the requested playwright-webext conventions with Oxc tooling:

- Oxlint type-aware linting, Oxfmt formatting, editor defaults, lint-staged hooks.
- Root type-check config and separate clean build with source/declaration maps.
- Unreleased changelog, package metadata, and source-inclusive package contents.
- Lint and test workflows on Node 24 / Ubuntu 24.04 only.
  This supersedes the initial Node 22/24 CI configuration above.
- Unmodified manual release workflow, with compatible script/workflow names.

Validation: all 47 existing tests, formatting, type-aware linting, type checking,
clean build, and packed consumer runtime/type/source-map checks passed locally.
Hosted CI and releases were not run.

Simplified the infrastructure to match playwright-webext: build cleanup and Git
hook configuration are inline package commands. Removed the standalone packed
consumer test and its `test:example` task; the verification above is historical.

## Empty structural branches

Removed restrictions on empty branches in parenthesized alternatives and empty
optional groups. Regression tests cover branch placement, repetition, nesting,
source ranges, ordered matching, stable slots, capture positions, and skipped
transformers. Inline choices and bare alternatives retain their existing rules.

## BddExpression constructor

Exported `BddExpression` with the Cucumber-style explicit-registry constructor.
README examples and differential checks exercise class construction, including
upstream registries. The existing factory returns a BddExpression.

## Reporter differential coverage

The compatibility matrix now compares JSON reporter output for BddExpression and
CucumberExpression on identical expressions and input, using the same recursive
playwright-bdd field projection as the reporter contract tests. This covers built-ins,
escaping, Unicode offsets, repeated captures, custom nested captures, empty captures,
no-argument matches, and nonmatches. Existing metadata and transformed-value checks
remain in place. This verifies serialization, not a running reporter integration.
