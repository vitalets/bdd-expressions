/**
 * Shares registration validation between raw options and externally constructed types.
 */

import { validTypeName } from '../parser.ts';
import type { ParameterType } from './create-type.ts';
import { normalizeParameterPatterns } from './normalize-pattern.ts';

/**
 * Validates an externally constructed type without replacing its identity or methods.
 */
export function validatePrebuiltType<T, Table>(type: ParameterType<T, Table>) {
  validateParameterTypeName(type.name);
  validateParameterTypeKind(type);
  if ('regexpStrings' in type) normalizeParameterPatterns(type.regexpStrings);
  return type as ParameterType<T, Table> & { readonly name: string };
}

/**
 * Rejects invalid names and names reserved for expression-generated types.
 */
export function validateParameterTypeName(name: string | undefined): asserts name is string {
  if (name === undefined || !validTypeName(name) || name === 'inline-choice') {
    throw new Error(`Invalid or reserved parameter type name "${name}"`);
  }
}

/**
 * Keeps DocString and DataTable definitions mutually exclusive and free of text patterns.
 */
export function validateParameterTypeKind(value: object) {
  if ('dataTable' in value || 'docString' in value) {
    if (
      ('dataTable' in value && 'docString' in value) ||
      'regexp' in value ||
      'regexpStrings' in value
    ) {
      throw new Error('Step argument types require exactly one step argument flag and no regexp');
    }
  }
}
