/**
 * Infers named values from valid expression literals without executing the parser.
 * Bounded input length keeps compiler work predictable.
 */

import type { IDataTable } from './param-types/data-table.ts';

/**
 * Named parameter inference for literals up to 256 characters.
 * Custom maps describe resolved transformer results and override built-in types.
 * Dynamic or longer expressions fall back to Record<string, unknown>.
 * This is not a syntax validator; runtime parsing remains authoritative.
 */
export type InferBddParams<
  Source extends string,
  Custom extends object = {},
> = Source extends unknown
  ? WithinBudget<Source> extends true
    ? Simplify<Scan<Source, Custom>>
    : Record<string, unknown>
  : never;

/**
 * Infers original block argument values from required built-in parameters.
 * Custom block argument names and dynamic sources conservatively allow absence.
 */
export type InferBddBlockArguments<
  Source extends string,
  Table = IDataTable,
> = Source extends unknown
  ? {
      readonly dataTable:
        | Table
        | (RequiredBlockArguments<Source> extends infer Required
            ? 'DataTable' extends Required
              ? never
              : undefined
            : undefined);
      readonly docString:
        | string
        | (RequiredBlockArguments<Source> extends infer Required
            ? 'DocString' extends Required
              ? never
              : undefined
            : undefined);
    }
  : never;

type RequiredBlockArguments<Source extends string> =
  WithinBudget<Source> extends true ? ScanBlockArguments<Source> : never;

type ScanBlockArguments<
  S extends string,
  Depth extends 0[] = [],
  Required extends string = never,
  InBareChoice extends boolean = false,
  Pending extends GroupTail[] = [],
> = S extends ''
  ? Pending extends [infer Next extends GroupTail, ...infer Rest extends GroupTail[]]
    ? ScanBlockArguments<Next[0], Next[1], Required, Next[2], Rest>
    : Required
  : S extends `\\${infer _Escaped}${infer Rest}`
    ? ScanBlockArguments<Rest, Depth, Required, InBareChoice, Pending>
    : S extends `${infer Open extends '(' | '['}${infer Rest}`
      ? ReadGroup<Rest, Open extends '(' ? ')' : ']'> extends [
          infer Body extends string,
          infer Tail extends string,
          infer Choice,
        ]
        ? ScanBlockArguments<
            Body,
            GroupDepth<Open, Choice, Tail, Depth, InBareChoice>,
            Required,
            false,
            [[Tail, Depth, InBareChoice], ...Pending]
          >
        : Required
      : S extends `:${infer First}${infer Rest}`
        ? First extends NameStart
          ? ReadName<Rest, First> extends [string, infer Tail extends string]
            ? ScanBlockArguments<Tail, Depth, Required, false, Pending>
            : Required
          : ScanBlockArguments<`${First}${Rest}`, Depth, Required, InBareChoice, Pending>
        : S extends `{${infer Rest}`
          ? ReadBraces<Rest> extends [
              infer Type extends string,
              infer Choices,
              infer Tail extends string,
            ]
            ? ScanBlockArguments<
                Tail,
                Depth,
                | Required
                | (Depth extends []
                    ? [Choices] extends [never]
                      ? Extract<Type, 'DataTable' | 'DocString'>
                      : never
                    : never),
                false,
                Pending
              >
            : Required
          : S extends `${infer First}${infer Rest}`
            ? ScanBlockArguments<
                Rest,
                Depth,
                Required,
                First extends '/' ? true : First extends ' ' ? false : InBareChoice,
                Pending
              >
            : Required;

type Builtins = {
  DataTable: IDataTable;
  DocString: string;
  int: number;
  byte: number;
  short: number;
  long: number;
  float: number;
  double: number;
  biginteger: bigint;
  bigdecimal: string;
  word: string;
  string: string;
  '': string;
};

type Letter =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';
type NameStart = Letter | Uppercase<Letter> | '_' | '$';
type NameChar = NameStart | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/**
 * Two small counters avoid allocating a 256-element tuple for every invocation.
 * Check the entire input first so truncation never returns a partial parameter map.
 */
type WithinBudget<
  S extends string,
  Chars extends 0[] = [],
  Blocks extends 0[] = [],
> = string extends S
  ? false
  : S extends ''
    ? true
    : Blocks['length'] extends 8
      ? false
      : S extends `${infer First}${infer Rest}`
        ? {} extends Record<First, unknown>
          ? false
          : Chars['length'] extends 31
            ? WithinBudget<Rest, [], [...Blocks, 0]>
            : WithinBudget<Rest, [...Chars, 0], Blocks>
        : false;

/**
 * Names are globally unique in valid expressions. Parameters in optional groups
 * or multi-branch choices can be absent. Single-branch required groups preserve
 * the enclosing optionality.
 * Bare alternatives cannot contain direct parameters, only grouped parameters.
 */
type Scan<
  S extends string,
  Custom extends object,
  Depth extends 0[] = [],
  Params = {},
  InBareChoice extends boolean = false,
  Pending extends GroupTail[] = [],
> = S extends ''
  ? Pending extends [infer Next extends GroupTail, ...infer Rest extends GroupTail[]]
    ? Scan<Next[0], Custom, Next[1], Params, Next[2], Rest>
    : Params
  : S extends `\\${infer _Escaped}${infer Rest}`
    ? Scan<Rest, Custom, Depth, Params, InBareChoice, Pending>
    : S extends `${infer Open extends '(' | '['}${infer Rest}`
      ? ReadGroup<Rest, Open extends '(' ? ')' : ']'> extends [
          infer Body extends string,
          infer Tail extends string,
          infer Choice,
        ]
        ? Scan<
            Body,
            Custom,
            GroupDepth<Open, Choice, Tail, Depth, InBareChoice>,
            Params,
            false,
            [[Tail, Depth, InBareChoice], ...Pending]
          >
        : Record<string, unknown>
      : S extends `:${infer First}${infer Rest}`
        ? First extends NameStart
          ? ReadName<Rest, First> extends [infer Name extends string, infer Tail extends string]
            ? Parameter<Tail, Name, Custom, Depth, Params, Pending>
            : Record<string, unknown>
          : Scan<`${First}${Rest}`, Custom, Depth, Params, InBareChoice, Pending>
        : S extends `{${string}`
          ? Parameter<S, never, Custom, Depth, Params, Pending>
          : S extends `${infer First}${infer Rest}`
            ? Scan<
                Rest,
                Custom,
                Depth,
                Params,
                First extends '/' ? true : First extends ' ' ? false : InBareChoice,
                Pending
              >
            : Record<string, unknown>;

type GroupTail = [source: string, depth: 0[], inBareChoice: boolean];

type GroupDepth<
  Open,
  Choice,
  Tail extends string,
  Depth extends 0[],
  InBareChoice,
> = Open extends '('
  ? [...Depth, 0]
  : true extends Choice | InBareChoice | HasBareChoice<Tail>
    ? [...Depth, 0]
    : Depth;

/**
 * A required group can also be skipped by a surrounding bare alternative.
 * Look ahead only within the current run; nested groups hide their own slashes.
 */
type HasBareChoice<S extends string> = S extends `\\${infer _Escaped}${infer Rest}`
  ? HasBareChoice<Rest>
  : S extends `${infer Open extends '(' | '['}${infer Rest}`
    ? ReadGroup<Rest, Open extends '(' ? ')' : ']'> extends [
        string,
        infer Tail extends string,
        boolean,
      ]
      ? HasBareChoice<Tail>
      : false
    : S extends `/${string}`
      ? true
      : S extends `${' ' | '{'}${string}` | `:${NameStart}${string}`
        ? false
        : S extends `${infer _First}${infer Rest}`
          ? HasBareChoice<Rest>
          : false;

/**
 * Reads a group's body and detects only its own alternative separators.
 * Escapes and nested delimiters, including parameter braces, hide their slashes.
 */
type ReadGroup<
  S extends string,
  Close extends string,
  Body extends string = '',
  Nested extends string[] = [],
  Choice extends boolean = false,
> = S extends `\\${infer Escaped}${infer Rest}`
  ? ReadGroup<Rest, Close, `${Body}\\${Escaped}`, Nested, Choice>
  : S extends `${infer First}${infer Rest}`
    ? First extends ')' | ']' | '}'
      ? Nested extends [string, ...infer Tail extends string[]]
        ? ReadGroup<Rest, Close, `${Body}${First}`, Tail, Choice>
        : First extends Close
          ? [Body, Rest, Choice]
          : never
      : First extends '(' | '[' | '{'
        ? ReadGroup<Rest, Close, `${Body}${First}`, [First, ...Nested], Choice>
        : ReadGroup<
            Rest,
            Close,
            `${Body}${First}`,
            Nested,
            First extends '/' ? (Nested extends [] ? true : Choice) : Choice
          >
    : never;

type Parameter<
  S extends string,
  Name extends string,
  Custom extends object,
  Depth extends 0[],
  Params,
  Pending extends GroupTail[],
> = S extends `{${infer Rest}`
  ? ReadBraces<Rest> extends [
      infer Type extends string,
      infer Choices extends string,
      infer Tail extends string,
    ]
    ? Scan<
        Tail,
        Custom,
        Depth,
        AddParam<
          Params,
          Name,
          [Choices] extends [never] ? ResolveType<Type, Custom> : Choices,
          Depth
        >,
        false,
        Pending
      >
    : Record<string, unknown>
  : Scan<
      S,
      Custom,
      Depth,
      AddParam<Params, Name, ResolveType<'string', Custom>, Depth>,
      false,
      Pending
    >;

type ReadName<S extends string, Name extends string> = S extends `${infer First}${infer Rest}`
  ? First extends NameChar
    ? ReadName<Rest, `${Name}${First}`>
    : [Name, S]
  : [Name, S];

/**
 * Decode escapes before constructing choice literals; escaped slashes do not
 * split choices. Unnamed braces are consumed too, hiding their literal colons.
 */
type ReadBraces<S extends string> = S extends `=${infer Rest}`
  ? ReadBracesContent<Rest, '', never, true>
  : ReadBracesContent<S>;

type ReadBracesContent<
  S extends string,
  Text extends string = '',
  Choices extends string = never,
  Explicit extends boolean = false,
> = S extends `\\${infer Escaped}${infer Rest}`
  ? ReadBracesContent<Rest, `${Text}${Escaped}`, Choices, Explicit>
  : S extends `}${infer Rest}`
    ? [
        Text,
        Explicit extends true ? Choices | Text : [Choices] extends [never] ? never : Choices | Text,
        Rest,
      ]
    : S extends `/${infer Rest}`
      ? ReadBracesContent<Rest, '', Choices | Text, Explicit>
      : S extends `${infer First}${infer Rest}`
        ? ReadBracesContent<Rest, `${Text}${First}`, Choices, Explicit>
        : false;

type ResolveType<Name extends string, Custom extends object> = Name extends keyof Custom
  ? Custom[Name]
  : Name extends keyof Builtins
    ? Builtins[Name]
    : unknown;

type AddParam<Params, Name extends string, Value, Depth extends 0[]> = Params & {
  [Key in Name]: Value | (Depth extends [] ? never : undefined);
};

/**
 * The empty intersection makes editor hovers expand the mapped parameter object.
 */
type Simplify<T> = { [Key in keyof T]: T[Key] } & {};
