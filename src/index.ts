/**
 * Defines the package entry point and keeps its supported public surface explicit.
 */

export { parseExpression, ExpressionError } from './parser.ts';
export type { Node, SourceRange } from './parser.ts';
export {
  createParameterType,
  createParameterTypeRegistry,
} from './cucumber-expressions/parameter-types.ts';
export type {
  ParameterType,
  ParameterTypeOptions,
  ParameterTypeRegistry,
  MutableParameterTypeRegistry,
} from './cucumber-expressions/parameter-types.ts';
export { BddExpression } from './compiler.ts';
export type { MatchValues } from './compiler.ts';
export type { Argument, Group } from './cucumber-expressions/matching.ts';
export type { InferBddParams } from './infer-params.ts';
