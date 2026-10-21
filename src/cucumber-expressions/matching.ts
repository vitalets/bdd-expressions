/**
 * Builds capture groups and match arguments that expose raw text, positions, and
 * parameter transformations using Cucumber Expressions 20.1.0-compatible contracts.
 * See THIRD_PARTY_NOTICES.md for attribution.
 */

import type { ParameterType } from './parameter-types.ts';
import type { Capture } from './capture-tree.ts';

export interface Group {
  readonly value: string | undefined;
  readonly start: number | undefined;
  readonly end: number | undefined;
  readonly children: readonly Group[] | undefined;
  readonly values: (string | undefined)[];
}
export interface Argument {
  readonly group: Group;
  readonly parameterType: ParameterType;
  getValue(world?: unknown): unknown;
  getParameterType(): ParameterType;
}

export function buildGroup(capture: Capture, match: RegExpExecArray): Group {
  const range = match.indices![capture.index];
  const children = capture.children.length
    ? capture.children.map((child) => buildGroup(child, match))
    : undefined;
  return {
    value: match[capture.index],
    start: range?.[0],
    end: range?.[1],
    children,
    get values() {
      return (children ?? [this]).map((group) => group.value);
    },
  };
}
export function buildArgument(group: Group, parameterType: ParameterType): Argument {
  return {
    group,
    parameterType,
    getValue(world) {
      return group.value === undefined ? undefined : parameterType.transform(world, group.values);
    },
    getParameterType() {
      return parameterType;
    },
  };
}
