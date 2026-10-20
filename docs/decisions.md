# Decisions

## Supplied requirements

The complete original requirements are preserved in
[specification.md](specification.md). They require a handwritten parser, AST,
native JavaScript RegExp with indices, stable slots, Cucumber-style runtime
contracts, and no runtime dependencies on Cucumber or an indices polyfill.

## Implementation decisions

- The repository was empty (including no AGENTS.md or git repository); there
  were no existing build or test conventions to preserve.
- Keep the original requirements verbatim in the specification as provenance.
  Add a normative resolved-language section there; it takes precedence over
  original statements identifying questions as unresolved.

## Initially unresolved

Names and literal colons; duplicate names; empty alternatives/groups; escaping;
backreference support; public values method; package format and Node baseline.
Resolve these before implementing the affected behavior.

## Resolutions for 0.1

- ESM, Node >=22, ES2022, TypeScript + node:test: a small modern baseline
  with native indices and ordinary TypeScript tests, without a bundler.
- ASCII variable names and deterministic colon recognition keep the scanner
  independent of registry state. Literal URL slashes require escapes as they do
  in Cucumber. Type names additionally allow dot and hyphen.
- Globally reject duplicate names, including across branches: no ambiguous
  `params` overwrite rule. Slots follow source order on every path.
- Only structural choices accept an empty first branch. Inline choices require
  nonempty branches so absence remains explicit in an enclosing optional.
- Explicit whole-input end assertion documents our intent. Differential testing
  verified that JavaScript `$` without `m` also rejects final newlines; an early
  assumption that this differed from Cucumber was corrected in the specification.
- A small factory API avoids unnecessary class identity promises. Async
  `matchValues` has one stable return type and sequential transformer ordering.
- Capture-tree scanning follows upstream's escape/class/parenthesis stack
  mechanism. Native indices supply ranges. Named capture labels are removed;
  backreferences and flags are rejected because silently combining them is unsafe.
- Complete built-ins are ported from npm version 20.1.0 with MIT attribution.
  The Cucumber package is development-only and used as a differential oracle.
- Full normative resolutions and grammar are in the specification; the initial
  questions above are now resolved. Framework adapters remain outside scope.

## Verified provenance and integration scope

- Runtime reference: npm `@cucumber/cucumber-expressions@20.1.0`, specifically
  `defineDefaultParameterTypes`, `ParameterType`, `CucumberExpression`,
  `CucumberExpressionParser`, `CucumberExpressionTokenizer`, `Argument`, `Group`,
  `TreeRegexp`, `GroupBuilder`, and the `Expression` interface in `types.d.ts`.
  The runtime implementation here imports none of that package.
- Upstream test harness and alternative/escaping fixtures were inspected at
  [commit b0dcbbab82745782737c723895e2e5d843b39a9a](https://github.com/cucumber/cucumber-expressions/tree/b0dcbbab82745782737c723895e2e5d843b39a9a/testdata/cucumber-expression/matching).
  Representative cases were expressed as ordinary TypeScript tables. We do not
  copy prohibitions on our intentionally supported grouped constructs.
- Reporter reference: npm `playwright-bdd@9.2.1`,
  `src/steps/matchedStepDefinition.ts`, `getStepMatchArguments()` and
  `mapArgumentGroup()`. The observed projection recursively serializes start,
  value, children, and the argument's parameter-type name. Tests exercise this
  projection; no claim is made about automatic framework parser selection.
- Honest metadata types include undefined for absent captures. Upstream's
  declarations understate this runtime possibility. The registry interface
  accepts upstream registries without casts; complete assignment compatibility
  with every upstream class/interface is not promised.
- Development uses Node 24's native TypeScript support without a tsx loader.
  Relative source imports use `.ts`; TypeScript rewrites them to `.js` for builds.
  `erasableSyntaxOnly` prevents syntax that native type stripping cannot handle.
  Constructor properties are declared explicitly to preserve the public API.

## Infrastructure alignment with playwright-webext

- User requested the shared infrastructure with CI restricted to Node 24 on
  Ubuntu 24.04. The runtime minimum remains Node 22; this changes CI coverage,
  not the public support declaration.
- Use Oxlint with type-aware checks (`oxlint-tsgolint`) and Oxfmt for formatting.
  Oxlint is the linter; formatting is provided by its companion Oxfmt package.
  No ESLint or Prettier dependency is needed. TypeScript remains at 7.0.2.
- Root TypeScript configuration checks source and tests without emitting. A
  dedicated build config emits declarations and source/declaration maps, with
  source files included in the package. Builds remove stale dist files first.
- Copy release.yaml byte-for-byte as requested. Retain its script names via
  compatible tasks (`prettier` runs Oxfmt, `tsc` checks types). Provide its three named
  validation workflows; test-example checks a real packed installation without
  introducing a browser runner or an additional package in the repository.
- The copied release workflow still checks the latest runs on its branch, not
  exact-commit results. This known limitation is deliberately retained by user
  instruction. No release has been triggered.
- Portable POSIX hooks run staged lint/format and full pre-push validation.
  Installation skips directories without their own .git entry, avoiding parent
  repository changes and failing installs outside a checkout.
- Package metadata uses the intended vitalets/bdd-expressions GitHub destination;
  this task does not create that remote repository or configure npm publishing.
- Add an Unreleased changelog. Do not import the TypeScript file-structure rule,
  documentation-writing skill, or strict function-size policy in this change.
- Oxfmt excludes the preserved specification and copied release workflow to
  preserve their original text, as well as generated output and the lockfile.
