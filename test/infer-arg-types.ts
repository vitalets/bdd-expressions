/**
 * Compile-time positional inference contracts, checked by npm run tsc.
 */
import type { InferBddArgs } from '../src/index.ts';
import type { IDataTable } from '../src/param-types/data-table.ts';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Point = { x: number };
type Text16 = 'abcdefghijklmnop';
type Text64 = `${Text16}${Text16}${Text16}${Text16}`;
type Text256 = `${Text64}${Text64}${Text64}${Text64}`;

expectType<Equal<InferBddArgs<'I buy {string}( for :count{int})'>, [string, number | undefined]>>();
expectType<Equal<InferBddArgs<'{int} :name {} :other{word}'>, [number, string, string, string]>>();
expectType<
  Equal<
    InferBddArgs<'{int}{byte}{short}{long}{float}{double}'>,
    [number, number, number, number, number, number]
  >
>();
expectType<
  Equal<
    InferBddArgs<'{string}{word}{}{bigdecimal}{biginteger}'>,
    [string, string, string, string, bigint]
  >
>();
expectType<Equal<InferBddArgs<'[:name/{int}]'>, [string | undefined, number | undefined]>>();
expectType<
  Equal<
    InferBddArgs<'{int}( :name( {word})) {float}'>,
    [number, string | undefined, string | undefined, number]
  >
>();
expectType<Equal<InferBddArgs<'[{int}] {word}'>, [number, string]>>();
expectType<Equal<InferBddArgs<'a[{int}]/b {word}'>, [number | undefined, string]>>();
expectType<Equal<InferBddArgs<'a/b\t[{int}]'>, [number | undefined]>>();
expectType<Equal<InferBddArgs<'[{int}/]'>, [number | undefined]>>();
expectType<Equal<InferBddArgs<'{yes/no} {=fixed} {yes/}'>, ['yes' | 'no', 'fixed', 'yes' | '']>>();
expectType<Equal<InferBddArgs<'\\:ignored \\{int\\} {=a\\/b} :name'>, ['a/b', string]>>();
expectType<Equal<InferBddArgs<'{a/:hidden} :visible'>, ['a' | ':hidden', string]>>();
expectType<Equal<InferBddArgs<'{Point} :point{Point}', { Point: Point }>, [Point, Point]>>();
expectType<
  Equal<InferBddArgs<'{int} :name', { int: bigint; string: boolean }>, [bigint, boolean]>
>();
expectType<Equal<InferBddArgs<'{Point}'>, [unknown]>>();
expectType<Equal<InferBddArgs<'{Items}', { Items: string[] }>, [string[]]>>();
expectType<Equal<InferBddArgs<'{int} {DataTable}'>, [number, IDataTable]>>();
expectType<Equal<InferBddArgs<':text{DocString}'>, [string]>>();
expectType<Equal<InferBddArgs<'({DataTable})', { DataTable: number[] }>, [number[] | undefined]>>();
expectType<
  Equal<InferBddArgs<'{DocString}', { DocString: { text: string } }>, [{ text: string }]>
>();
expectType<Equal<InferBddArgs<''>, []>>();
expectType<Equal<InferBddArgs<'plain text'>, []>>();
expectType<Equal<InferBddArgs<'{int}' | ':name'>, [number] | [string]>>();
expectType<Equal<InferBddArgs<never>, never>>();
expectType<Equal<InferBddArgs<string>, unknown[]>>();
expectType<Equal<InferBddArgs<`:x${number}`>, unknown[]>>();
expectType<Equal<InferBddArgs<Text256>, []>>();
expectType<Equal<InferBddArgs<`${Text256}x`>, unknown[]>>();
// A fallback must discard already encountered parameters, not infer a partial tuple.
expectType<Equal<InferBddArgs<`{int}${Text256}`>, unknown[]>>();

function expectType<_T extends true>() {}
