/**
 * Keeps the browser's TypeScript language service alive between expression edits.
 */

import es5 from 'typescript/lib/lib.es5.d.ts?raw';
import decorators from 'typescript/lib/lib.decorators.d.ts?raw';
import legacyDecorators from 'typescript/lib/lib.decorators.legacy.d.ts?raw';
import inferenceSource from '../../src/infer-params.ts?raw';
import { createTypePreview } from './type-preview.ts';

/**
 * Standard declarations required by the inference types, bundled with the compiler version.
 */
const libraries = new Map([
  ['/lib.es5.d.ts', es5],
  ['/lib.decorators.d.ts', decorators],
  ['/lib.decorators.legacy.d.ts', legacyDecorators],
]);
/**
 * Reuses parsed libraries and compiler state for subsequent requests.
 */
const preview = createTypePreview(inferenceSource, libraries);

export type TypeRequest = { id: number; expression: string };
export type TypeResult = { id: number; text: string };

self.onmessage = (event: MessageEvent<TypeRequest>) => {
  const { id, expression } = event.data;
  try {
    self.postMessage({ id, text: preview(expression) } satisfies TypeResult);
  } catch (error) {
    self.postMessage({
      id,
      text: `Type inference failed: ${error instanceof Error ? error.message : String(error)}`,
    } satisfies TypeResult);
  }
};
