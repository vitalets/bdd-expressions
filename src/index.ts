/**
 * Defines the package entry point and keeps its supported public surface explicit.
 */

export { parseExpression, ExpressionError } from './parser.ts';
export type { Node, SourceRange } from './parser.ts';
export { createParameterType } from './parameter-types/create-type.ts';
export { createParameterTypeRegistry } from './parameter-types/registry.ts';
export type {
  ParameterType,
  ParameterTypeOptions,
  TextParameterType,
  TextParameterTypeOptions,
} from './parameter-types/create-type.ts';
export type {
  DataTableParameterType,
  DataTableParameterTypeOptions,
} from './parameter-types/data-table.ts';
export type {
  DocStringParameterType,
  DocStringParameterTypeOptions,
} from './parameter-types/doc-string.ts';
export type {
  ParameterTypeRegistry,
  MutableParameterTypeRegistry,
} from './parameter-types/registry.ts';
export { BddExpression } from './compiler.ts';
export type { BddExpressionResult } from './compiler.ts';
export type { Argument, Group } from './cucumber-expressions/matching.ts';
export type { InferBddParams } from './infer-params.ts';
export type { AttachmentInputs } from './attachments.ts';
