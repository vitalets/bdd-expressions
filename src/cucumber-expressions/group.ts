/**
 * Builds capture groups that expose raw text and positions using
 * Cucumber Expressions 20.1.0-compatible contracts.
 * See THIRD_PARTY_NOTICES.md for attribution.
 */

import type { Capture } from './capture-tree.ts';

export type Group = {
  readonly value: string | undefined;
  readonly start: number | undefined;
  readonly end: number | undefined;
  readonly children: readonly Group[] | undefined;
  readonly values: (string | undefined)[];
};
/**
 * Builds a capture tree with native positions, preserving absent and empty captures.
 */
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
