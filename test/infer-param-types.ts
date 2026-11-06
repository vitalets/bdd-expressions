/**
 * Compile-time tests, checked by npm run tsc. This file is never run by node:test.
 * Each comparison fails compilation if the inferred type differs from the expected type.
 * Covers valid grammar constructs; invalid syntax and matching behavior belong to
 * the runtime syntax tests because InferBddParams is not a syntax validator.
 */
import { BddExpression, type InferBddParams, type ParameterTypeRegistry } from '../src/index.ts';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type ParamsOf<E extends { matchAndResolve(text: string): unknown }> =
  NonNullable<Awaited<ReturnType<E['matchAndResolve']>>> extends { params: infer P } ? P : never;

// Build a 256-character literal without a long, unreadable line.
type Text16 = 'abcdefghijklmnop';
type Text64 = `${Text16}${Text16}${Text16}${Text16}`;
type Text256 = `${Text64}${Text64}${Text64}${Text64}`;

// Infer required numbers and optional strings.
expectType<
  Equal<
    InferBddParams<'I buy :count{int} apples( for :owner)'>,
    { count: number; owner: string | undefined }
  >
>();

// Map all numeric built-ins to number.
expectType<
  Equal<
    InferBddParams<':a{int}:b{byte}:c{short}:d{long}:e{float}:f{double}'>,
    { a: number; b: number; c: number; d: number; e: number; f: number }
  >
>();

// Map string, arbitrary text, decimal, and bigint built-ins.
expectType<
  Equal<
    InferBddParams<':a{string}:b{word}:c{}:d{bigdecimal}:e{biginteger}'>,
    { a: string; b: string; c: string; d: string; e: bigint }
  >
>();

// Parameters in nested optional groups can be absent.
expectType<
  Equal<
    InferBddParams<':item( as :owner( in :workspace))'>,
    { item: string; owner: string | undefined; workspace: string | undefined }
  >
>();

// Combine grouped alternatives with inline choice literals.
expectType<
  Equal<
    InferBddParams<'(:page/:label) :status{pending/approved}'>,
    { page: string | undefined; label: string | undefined; status: 'pending' | 'approved' }
  >
>();

// Optional literal text does not make surrounding parameters optional.
expectType<Equal<InferBddParams<'I buy :count{int} apple(s)( today)'>, { count: number }>>();

// Keep consecutive optional parameters separate from required parameters.
expectType<
  Equal<
    InferBddParams<'I send( :message)( :recipient) :after'>,
    { message: string | undefined; recipient: string | undefined; after: string }
  >
>();

// An optional inline choice includes undefined.
expectType<
  Equal<
    InferBddParams<'Set( :status{pending/approved})'>,
    { status: 'pending' | 'approved' | undefined }
  >
>();

// Preserve whole phrases in inline choice unions.
expectType<
  Equal<
    InferBddParams<'I :action{click/tap on/press and hold}'>,
    { action: 'click' | 'tap on' | 'press and hold' }
  >
>();

// Built-in names inside choices are literal values.
expectType<Equal<InferBddParams<':kind{int/float}'>, { kind: 'int' | 'float' }>>();

// Structural choices do not create named parameters.
expectType<
  Equal<InferBddParams<'I [click/tap on/press and hold] :page with mouse/touch'>, { page: string }>
>();

// Parameters inside bare alternative groups can be absent.
expectType<
  Equal<
    InferBddParams<'open( :page)/select( :label) :after'>,
    { page: string | undefined; label: string | undefined; after: string }
  >
>();

// Respect parameters and escaped spaces around bare alternatives.
expectType<
  Equal<
    InferBddParams<':count{int}apple/pear click/tap\\ on :page'>,
    { count: number; page: string }
  >
>();

// Track parameters through nested alternatives.
expectType<
  Equal<
    InferBddParams<'(by :owner/(on :page/with :label)) :after'>,
    {
      owner: string | undefined;
      page: string | undefined;
      label: string | undefined;
      after: string;
    }
  >
>();

// Empty alternative branches leave their parameters undefined.
expectType<
  Equal<
    InferBddParams<'(/:first) (:second//:third/) :after'>,
    {
      first: string | undefined;
      second: string | undefined;
      third: string | undefined;
      after: string;
    }
  >
>();

// Empty groups and choices do not create parameters.
expectType<Equal<InferBddParams<'() (/) (//) (()/()) :page'>, { page: string }>>();

// An empty expression has no named parameters.
expectType<Equal<InferBddParams<''>, {}>>();

// Unnamed captures do not appear in the named map.
expectType<Equal<InferBddParams<'{int} {string} {} {yes/no}'>, {}>>();

// Accept ASCII identifier characters and prototype-like names.
expectType<
  Equal<
    InferBddParams<':$x :_a1 :Z9 :__proto__ :constructor'>,
    { $x: string; _a1: string; Z9: string; __proto__: string; constructor: string }
  >
>();

// Non-identifier characters stay literal or end the parameter name.
expectType<
  Equal<InferBddParams<':9 :árbol :café :a-b :c.d'>, { caf: string; a: string; c: string }>
>();

// Custom type names may contain dots, hyphens, and digits.
expectType<
  Equal<
    InferBddParams<':point{geo.Point-v2}', { 'geo.Point-v2': { x: number } }>,
    { point: { x: number } }
  >
>();

// Whitespace, quotes, and regex punctuation remain literal.
expectType<
  Equal<InferBddParams<'\t":page"\n\u00a0:count{int} | [a].*+?$^'>, { page: string; count: number }>
>();

// Skip unnamed captures, including colons inside inline choices.
expectType<Equal<InferBddParams<'{int} {a/:hidden} :visible'>, { visible: string }>>();

// Escaped colons and parentheses stay literal; escaped slashes stay in choices.
expectType<
  Equal<
    InferBddParams<'\\:ignored \\(:owner\\) :choice{a\\/b/c}'>,
    { owner: string; choice: 'a/b' | 'c' }
  >
>();

// Escaped braces stay literal; an escaped backslash does not hide a parameter.
expectType<Equal<InferBddParams<'\\{fake\\} \\\\:real'>, { real: string }>>();

// Decode escaped delimiters and backslashes in choice values.
expectType<
  Equal<
    InferBddParams<':choice{a\\}b/\\{c\\}/\\(d\\)/e\\:f/g\\\\h}'>,
    { choice: 'a}b' | '{c}' | '(d)' | 'e:f' | 'g\\h' }
  >
>();

// Infer English parameter names inside Spanish text.
expectType<
  Equal<
    InferBddParams<'Compro :count{int} manzanas( para :owner)'>,
    { count: number; owner: string | undefined }
  >
>();

// Preserve non-English choice values.
expectType<
  Equal<InferBddParams<'状態を:status{承認済み/保留}にする'>, { status: '承認済み' | '保留' }>
>();

// Custom types without a mapping resolve to unknown.
expectType<Equal<InferBddParams<':point{Point}'>, { point: unknown }>>();

// Apply custom type mappings to required and optional parameters.
expectType<
  Equal<
    InferBddParams<':point{Point}( :other{Point})', { Point: { x: number } }>,
    { point: { x: number }; other: { x: number } | undefined }
  >
>();

// Custom mappings can override built-in results.
expectType<Equal<InferBddParams<':count{int}', { int: bigint }>, { count: bigint }>>();

// Plain text has no named parameters.
expectType<Equal<InferBddParams<'plain text'>, {}>>();

// Infer each member of an expression union.
expectType<Equal<InferBddParams<':a' | ':b{int}'>, { a: string } | { b: number }>>();

// Dynamic strings fall back to a broad map.
expectType<Equal<InferBddParams<string>, Record<string, unknown>>>();

// Open-ended parameter names fall back to a broad map.
expectType<Equal<InferBddParams<`:x${number}`>, Record<string, unknown>>>();

// Inference accepts an expression at the length limit.
expectType<Equal<InferBddParams<Text256>, {}>>();

// Expressions beyond the length limit fall back to a broad map.
expectType<Equal<InferBddParams<`${Text256}x`>, Record<string, unknown>>>();

// Verify the public constructor types without executing matching or transformers.
declare const registry: ParameterTypeRegistry;
const typed = new BddExpression(':count{int}( :owner)', registry);
const broad = new BddExpression<Record<string, unknown>>(':count{int}', registry);
const manual = new BddExpression<{ count: number }>(':count{int}', registry);
declare const source: string;
const dynamic = new BddExpression(source, registry);

// Explicit contracts are used as supplied, independently of the expression text.
const overridden = new BddExpression<{ count: bigint }>(':count{int}', registry);
declare const longSource: `${Text256}:count{int}`;
const longInferred = new BddExpression(longSource, registry);
const longManual = new BddExpression<{ count: number }>(longSource, registry);
const widened: BddExpression = typed;
const explicitView: BddExpression<{ count: number; owner: string | undefined }> = typed;

// The constructor infers named parameters by default.
expectType<Equal<ParamsOf<typeof typed>, { count: number; owner: string | undefined }>>();

// An explicit broad map disables inference.
expectType<Equal<ParamsOf<typeof broad>, Record<string, unknown>>>();

// The constructor accepts manual parameter types.
expectType<Equal<ParamsOf<typeof manual>, { count: number }>>();

// A dynamic constructor input keeps named values unknown.
expectType<Equal<ParamsOf<typeof dynamic>, Record<string, unknown>>>();

// Explicit parameter types take precedence over inferred types.
expectType<Equal<ParamsOf<typeof overridden>, { count: bigint }>>();

// Long constructor inputs use the inference fallback.
expectType<Equal<ParamsOf<typeof longInferred>, Record<string, unknown>>>();

// Manual types still apply beyond the inference length limit.
expectType<Equal<ParamsOf<typeof longManual>, { count: number }>>();

// Inferred instances can be assigned to the general expression type.
expectType<Equal<ParamsOf<typeof widened>, Record<string, unknown>>>();

// Inferred instances can be assigned to a compatible explicit parameter type.
expectType<Equal<ParamsOf<typeof explicitView>, { count: number; owner: string | undefined }>>();

declare const params: ParamsOf<typeof typed>;
// @ts-expect-error Undeclared names are rejected.
void params.missing;
// @ts-expect-error Optional parameters must be narrowed before use.
const owner: string = params.owner;
void owner;

/**
 * Requires a comparison to evaluate to true at compile time.
 */
declare function expectType<T extends true>(): T;

// Explicit literals and empty alternatives retain exact values.
expectType<Equal<InferBddParams<':flag{=permanently}'>, { flag: 'permanently' }>>();
expectType<
  Equal<
    InferBddParams<'I delete the account( :permanent{=permanently})'>,
    { permanent: 'permanently' | undefined }
  >
>();
expectType<Equal<InferBddParams<':flag{permanently/}'>, { flag: 'permanently' | '' }>>();
expectType<Equal<InferBddParams<':flag{/permanently/}'>, { flag: 'permanently' | '' }>>();
expectType<Equal<InferBddParams<':flag{=}'>, { flag: '' }>>();
expectType<Equal<InferBddParams<':flag{=pending/approved}'>, { flag: 'pending' | 'approved' }>>();
expectType<Equal<InferBddParams<':flag{=for good}'>, { flag: 'for good' }>>();
expectType<Equal<InferBddParams<':flag{==pending}'>, { flag: '=pending' }>>();
expectType<Equal<InferBddParams<':flag{=word}'>, { flag: 'word' }>>();
expectType<Equal<InferBddParams<':flag{=永久に}'>, { flag: '永久に' }>>();
expectType<Equal<InferBddParams<':flag{=a\\/b}'>, { flag: 'a/b' }>>();

// Required grouping preserves single-branch types and optional choice slots.
expectType<Equal<InferBddParams<'[:count{int}] :after'>, { count: number; after: string }>>();
expectType<Equal<InferBddParams<'[[:count{int}]]'>, { count: number }>>();
expectType<
  Equal<InferBddParams<'[:count{int}/none] :after'>, { count: number | undefined; after: string }>
>();
expectType<Equal<InferBddParams<'[:count{int}/]'>, { count: number | undefined }>>();
expectType<Equal<InferBddParams<'([:count{int}])'>, { count: number | undefined }>>();
expectType<Equal<InferBddParams<'[(:count{int})]'>, { count: number | undefined }>>();
expectType<
  Equal<InferBddParams<'[:status{pending/approved}]'>, { status: 'pending' | 'approved' }>
>();
expectType<Equal<InferBddParams<'[a/b] [:count{int}]'>, { count: number }>>();
expectType<Equal<InferBddParams<'[a/b][:count{int}]'>, { count: number }>>();
expectType<Equal<InferBddParams<'a[:count{int}]/b'>, { count: number | undefined }>>();
expectType<Equal<InferBddParams<'a/b[:count{int}]'>, { count: number | undefined }>>();
expectType<Equal<InferBddParams<'a/b [:count{int}]'>, { count: number }>>();
expectType<Equal<InferBddParams<'[a/(b)] [:count{int}]'>, { count: number }>>();
expectType<
  Equal<
    InferBddParams<'[(:first)/:second{int}] :after'>,
    { first: string | undefined; second: number | undefined; after: string }
  >
>();

// Group scanning hides escaped delimiters and slashes from structural inference.
expectType<Equal<InferBddParams<'[a\\/b :count{int}]'>, { count: number }>>();
expectType<Equal<InferBddParams<'[a\\]b :count{int}]'>, { count: number }>>();
expectType<Equal<InferBddParams<'[a/b] :first[:second]'>, { first: string; second: string }>>();

// Deep valid groups stay within the documented 256-character inference budget.
expectType<
  Equal<
    InferBddParams<'[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[:count{int}]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]'>,
    { count: number }
  >
>();
expectType<
  Equal<
    InferBddParams<'((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((:count{int}))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))'>,
    { count: number | undefined }
  >
>();

// Only ASCII space ends a bare alternative, matching the runtime parser.
expectType<Equal<InferBddParams<'a/b\t[:count{int}]'>, { count: number | undefined }>>();
expectType<Equal<InferBddParams<'a/b\n[:count{int}]'>, { count: number | undefined }>>();
expectType<Equal<InferBddParams<'a/b\u00a0[:count{int}]'>, { count: number | undefined }>>();
expectType<Equal<InferBddParams<'a[:count{int}]\tend/b'>, { count: number | undefined }>>();
expectType<Equal<InferBddParams<'a[:count{int}] end/b'>, { count: number }>>();
