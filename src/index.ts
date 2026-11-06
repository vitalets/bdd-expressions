/**
 * Provides expression matching and value resolution through the public package API.
 */

import type { IDataTable } from './param-types/data-table.ts';
import type { Slot } from './compiler.ts';
import type { ParameterType, TextParameterType } from './param-types/create-type.ts';
import type { StepArguments } from './step-arguments.ts';
import { parseExpression, type Node } from './parser.ts';
import type { ParameterTypeRegistry } from './param-types/registry.ts';
import { compileExpressionVariants, selectExpressionVariant } from './variants.ts';
import {
  buildArgument,
  buildGroup,
  type Argument,
  type Group,
} from './cucumber-expressions/matching.ts';
import type { InferBddParams, InferBddStepArguments } from './infer-params.ts';

export type BddExpressionResult<
  Params extends object = Record<string, unknown>,
  Table = IDataTable,
  Source extends string = string,
> = unknown[] & {
  readonly params: Params;
} & InferBddStepArguments<Source, Table>;

export { parseExpression, ExpressionError } from './parser.ts';
export type { Node, SourceRange } from './parser.ts';
export { createParameterType } from './param-types/create-type.ts';
export { createParameterTypeRegistry } from './param-types/registry.ts';
export type {
  ParameterType,
  ParameterTypeOptions,
  TextParameterType,
  TextParameterTypeOptions,
} from './param-types/create-type.ts';
export type {
  DataTableParameterType,
  DataTableParameterTypeOptions,
} from './param-types/data-table.ts';
export type {
  DocStringParameterType,
  DocStringParameterTypeOptions,
} from './param-types/doc-string.ts';
export type {
  ParameterTypeRegistry,
  MutableParameterTypeRegistry,
} from './param-types/registry.ts';
export type { Argument, Group } from './cucumber-expressions/matching.ts';
export type { InferBddParams } from './infer-params.ts';
export type { StepArguments } from './step-arguments.ts';

/**
 * Matches a parsed expression using a compiled regexp and source-ordered parameters.
 * Table is inferred from the registry so step arguments and table transformers agree
 * without requiring the library to import or construct a runner's DataTable class.
 * Infers named values from expression literals unless a Params contract is supplied.
 * An explicit Params type bypasses inference and must match the expression and registry.
 * Values resolves that choice once, keeping instances assignable to BddExpression
 * without requiring their source literal in type annotations.
 */
export class BddExpression<
  Params extends object = never,
  Source extends string = string,
  Table = IDataTable,
  Values extends object = [Params] extends [never]
    ? InferBddParams<Source, { DataTable: Table }>
    : Params,
> {
  readonly source: string;
  readonly ast: Node;
  readonly regexp: RegExp;
  private readonly slots: ReturnType<
    typeof compileExpressionVariants
  >['withoutStepArguments']['slots'];
  private readonly variants: ReturnType<typeof compileExpressionVariants>;

  constructor(pattern: Source, parameterTypeRegistry: ParameterTypeRegistry<Table>) {
    this.source = pattern;
    const ast = parseExpression(pattern);
    this.variants = compileExpressionVariants(pattern, parameterTypeRegistry, ast);
    const compiled = this.variants.withoutStepArguments;
    this.ast = compiled.ast;
    this.regexp = compiled.regexp;
    this.slots = compiled.slots;
  }

  /**
   * Matches the whole input and retains metadata for absent parameters.
   */
  match(text: string, stepArguments: StepArguments<Table> = {}) {
    const variant = selectExpressionVariant(this.variants, stepArguments);
    if (!variant) return null;
    const result = variant.regexp.exec(text);
    if (!result) return null;
    const args: readonly Argument[] = variant.slots.map((slot) =>
      buildArgumentForSlot(slot, result, stepArguments),
    );
    return args;
  }

  /**
   * Resolves positional and named values with the supplied transformer context.
   */
  async matchAndResolve(text: string, options: StepArguments<Table> & { world?: unknown } = {}) {
    const args = this.match(text, options);
    if (args === null) return null;
    const { positional, named } = await this.resolveParams(args, options.world);
    Object.defineProperties(positional, {
      params: { value: named, enumerable: false },
      docString: { value: options.docString, enumerable: false },
      dataTable: { value: options.dataTable, enumerable: false },
    });
    return positional as BddExpressionResult<Values, Table, Source>;
  }

  /**
   * Resolves named and unnamed parameters concurrently with the supplied world.
   * The named parameter map has no prototype.
   *
   * Uses parallel resolution to follow the Cucumber.js implementation:
   * https://github.com/cucumber/cucumber-js/blob/main/src/models/step_definition.ts#L26-L28
   */
  private async resolveParams(paramValues: readonly Argument[], world: unknown) {
    const positional = await Promise.all(paramValues.map((argument) => argument.getValue(world)));
    const named: Record<string, unknown> = Object.create(null);
    for (const [index, argument] of paramValues.entries()) {
      const name = argument.name;
      if (name !== undefined) named[name] = positional[index];
    }
    return { positional, named };
  }
}

function buildArgumentForSlot(
  slot: Slot,
  result: RegExpExecArray,
  stepArguments: StepArguments<unknown>,
) {
  const group = buildGroup(slot.capture, result);
  const { type, name } = slot;
  if (isStepArgumentType(type)) {
    return buildStepArgument(group, type, name, stepArguments);
  }
  return buildArgument(group, type, name);
}

function buildStepArgument(
  group: Group,
  type: Exclude<ParameterType, TextParameterType>,
  name: string | undefined,
  stepArguments: StepArguments<unknown>,
) {
  const argument: Argument = {
    name,
    parameterType: type,
    getParameterType: () => type,
    group: {
      value: undefined,
      start: undefined,
      end: undefined,
      children: undefined,
      values: [undefined],
    },
    getValue(world?: unknown) {
      if (group.value === undefined) return undefined;
      if ('dataTable' in type) {
        return stepArguments.dataTable === undefined
          ? undefined
          : type.transform(world, stepArguments.dataTable);
      }
      return stepArguments.docString === undefined
        ? undefined
        : type.transform(world, stepArguments.docString);
    },
  };
  return argument;
}

function isStepArgumentType(type: ParameterType) {
  return 'dataTable' in type || 'docString' in type;
}
