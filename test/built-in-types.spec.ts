import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BddExpression, createParameterTypeRegistry } from '../src/index.ts';

test('int', async () => {
  // Converts signed integers and leading zeros to numbers.
  await accepted('int', [
    ['0', 0],
    ['-42', -42],
    ['0012', 12],
  ]);
  rejected('int', ['', '+12', '1.2', '12a', ' 12']);
});

test('byte', async () => {
  // Converts integers without enforcing an 8-bit range.
  await accepted('byte', [
    ['0', 0],
    ['-129', -129],
    ['256', 256],
  ]);
  rejected('byte', ['', '+1', '1.5']);
});

test('short', async () => {
  // Converts integers without enforcing a 16-bit range.
  await accepted('short', [
    ['0', 0],
    ['-32769', -32769],
    ['32768', 32768],
  ]);
  rejected('short', ['', '+1', '1.5']);
});

test('long', async () => {
  // Converts integers to numbers, including their precision limits.
  await accepted('long', [
    ['0', 0],
    ['-42', -42],
    ['9007199254740993', 9007199254740992],
  ]);
  rejected('long', ['', '+1', '1.5']);
});

test('biginteger', async () => {
  // Preserves integer precision as bigint.
  await accepted('biginteger', [
    ['0', 0n],
    ['0012', 12n],
    ['9007199254740993', 9007199254740993n],
    ['-9007199254740993', -9007199254740993n],
  ]);
  rejected('biginteger', ['', '+1', '1.5', '1E2']);
});

test('float', async () => {
  // Converts decimals and uppercase exponents to numbers.
  await accepted('float', [
    ['0', 0],
    ['-1.25', -1.25],
    ['+.5', 0.5],
    ['1E2', 100],
    ['-.1E-2', -0.001],
  ]);
  rejected('float', ['', '.', '1.', '1e2', '1,000', 'NaN', 'Infinity']);
});

test('double', async () => {
  // Converts decimals and uppercase exponents to numbers.
  await accepted('double', [
    ['0', 0],
    ['-1.25', -1.25],
    ['+.5', 0.5],
    ['1E+2', 100],
    ['1E-2', 0.01],
  ]);
  rejected('double', ['', '.', '1.', '1e2', '1,000', 'NaN', 'Infinity']);
});

test('bigdecimal', async () => {
  // Preserves decimal text, precision and formatting.
  await accepted('bigdecimal', [
    ['1.20', '1.20'],
    ['+001.20', '+001.20'],
    ['-.5', '-.5'],
    ['1E+2', '1E+2'],
    ['9007199254740993.123456789', '9007199254740993.123456789'],
  ]);
  rejected('bigdecimal', ['', '.', '1.', '1e2', 'NaN', 'Infinity']);
});

test('word', async () => {
  // Preserves a nonempty sequence of non-whitespace characters.
  await accepted('word', [
    ['hello', 'hello'],
    ['42', '42'],
    ['hello-world!', 'hello-world!'],
    ['😀', '😀'],
  ]);
  rejected('word', ['', 'two words', 'a\tb', 'a\nb', ' word', 'word ']);
});

test('string', async () => {
  // Removes quotes and unescapes quotes while preserving other backslashes.
  await accepted('string', [
    ['"hello"', 'hello'],
    ["'hello'", 'hello'],
    ['""', ''],
    ["''", ''],
    ['"42"', '42'],
    [String.raw`"a\"b"`, 'a"b'],
    [String.raw`'a\'b'`, "a'b"],
    [String.raw`"a\'b"`, "a'b"],
    [String.raw`'a\"b'`, 'a"b'],
    [String.raw`"a\nb"`, String.raw`a\nb`],
    [String.raw`"a\\b"`, String.raw`a\\b`],
    ['"a\nb"', 'a\nb'],
  ]);
  rejected('string', ['', 'unquoted', '"unterminated', '\'mismatched"', '"a"b"']);
});

test('anonymous', async () => {
  // Preserves arbitrary text, including empty text and whitespace.
  await accepted('', [
    ['', ''],
    ['hello world', 'hello world'],
    ['  a\tb  ', '  a\tb  '],
    ['"quoted"', '"quoted"'],
    ['42', '42'],
  ]);
  rejected('', ['a\nb', 'text\n']);
});

async function accepted(
  name: string,
  accepted: readonly (readonly [input: string, expected: unknown])[],
) {
  const expression = new BddExpression(`{${name}}`, createParameterTypeRegistry());
  for (const [input, expected] of accepted) {
    const message = `{${name}} matching ${JSON.stringify(input)}`;
    const args = expression.match(input);
    assert.ok(args, message);
    assert.equal(args.length, 1, message);
    assert.equal(args[0]!.parameterType.name, name, message);
    assert.deepEqual(await expression.matchValues(input), [expected], message);
  }
}

function rejected(name: string, rejected: readonly string[]) {
  const expression = new BddExpression(`{${name}}`, createParameterTypeRegistry());
  for (const input of rejected) {
    assert.equal(expression.match(input), null, `{${name}} must reject ${JSON.stringify(input)}`);
  }
}
