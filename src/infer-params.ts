/**
 * Infers named values from valid expression literals without executing the parser.
 * Bounded input length keeps compiler work predictable.
 */

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

type Builtins = {
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
 * Names are globally unique in valid expressions. Each parameter inside a group
 * can be absent: the group is optional, or another alternative can be selected.
 * Bare alternatives cannot contain direct parameters, only grouped parameters.
 */
type Scan<
  S extends string,
  Custom extends object,
  Depth extends 0[] = [],
  Params = {},
> = S extends ''
  ? Params
  : S extends `\\${infer _Escaped}${infer Rest}`
    ? Scan<Rest, Custom, Depth, Params>
    : S extends `(${infer Rest}`
      ? Scan<Rest, Custom, [...Depth, 0], Params>
      : S extends `)${infer Rest}`
        ? Scan<Rest, Custom, Depth extends [0, ...infer Tail extends 0[]] ? Tail : [], Params>
        : S extends `:${infer First}${infer Rest}`
          ? First extends NameStart
            ? ReadName<Rest, First> extends [infer Name extends string, infer Tail extends string]
              ? Parameter<Tail, Name, Custom, Depth, Params>
              : Record<string, unknown>
            : Scan<`${First}${Rest}`, Custom, Depth, Params>
          : S extends `{${string}`
            ? Parameter<S, never, Custom, Depth, Params>
            : S extends `${infer _First}${infer Rest}`
              ? Scan<Rest, Custom, Depth, Params>
              : Record<string, unknown>;

type Parameter<
  S extends string,
  Name extends string,
  Custom extends object,
  Depth extends 0[],
  Params,
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
        >
      >
    : Record<string, unknown>
  : Scan<S, Custom, Depth, AddParam<Params, Name, ResolveType<'string', Custom>, Depth>>;

type ReadName<S extends string, Name extends string> = S extends `${infer First}${infer Rest}`
  ? First extends NameChar
    ? ReadName<Rest, `${Name}${First}`>
    : [Name, S]
  : [Name, S];

/**
 * Decode escapes before constructing choice literals; escaped slashes do not
 * split choices. Unnamed braces are consumed too, hiding their literal colons.
 */
type ReadBraces<
  S extends string,
  Text extends string = '',
  Choices extends string = never,
> = S extends `\\${infer Escaped}${infer Rest}`
  ? ReadBraces<Rest, `${Text}${Escaped}`, Choices>
  : S extends `}${infer Rest}`
    ? [Text, [Choices] extends [never] ? never : Choices | Text, Rest]
    : S extends `/${infer Rest}`
      ? ReadBraces<Rest, '', Choices | Text>
      : S extends `${infer First}${infer Rest}`
        ? ReadBraces<Rest, `${Text}${First}`, Choices>
        : false;

type ResolveType<Name extends string, Custom extends object> = Name extends keyof Custom
  ? Custom[Name]
  : Name extends keyof Builtins
    ? Builtins[Name]
    : unknown;

type AddParam<Params, Name extends string, Value, Depth extends 0[]> = Params & {
  [Key in Name]: Value | (Depth extends [] ? never : undefined);
};

type Simplify<T> = { [Key in keyof T]: T[Key] };
