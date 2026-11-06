/**
 * Resolves named parameter types with the library's own inference source in a virtual compiler.
 */

import ts from 'typescript';
import { createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';

/**
 * Virtual query updated on each expression change while the language service stays alive.
 */
const queryPath = '/query.ts';

/**
 * Creates a reusable type preview with bundled declarations and no network dependency.
 */
export function createTypePreview(inferenceSource: string, libraries: Map<string, string>) {
  const files = new Map(libraries);
  files.set('/infer-params.ts', inferenceSource);
  files.set(queryPath, 'export {};');
  const environment = createVirtualTypeScriptEnvironment(createSystem(files), [queryPath], ts, {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es5.d.ts'],
    skipLibCheck: true,
  });

  return (expression: string) => {
    environment.updateFile(
      queryPath,
      `import type { InferBddParams } from './infer-params';\nimport type { IDataTable } from './param-types/data-table';\ndeclare const params: InferBddParams<${JSON.stringify(expression)}>;`,
    );
    const diagnostics = [
      ...environment.languageService.getSyntacticDiagnostics(queryPath),
      ...environment.languageService.getSemanticDiagnostics(queryPath),
    ];
    if (diagnostics.length) {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostics[0]!.messageText, '\n'));
    }
    const program = environment.languageService.getProgram()!;
    const source = program.getSourceFile(queryPath)!;
    const statement = source.statements.find(ts.isVariableStatement)!;
    const declaration = statement.declarationList.declarations[0]!;
    const checker = program.getTypeChecker();
    const type = checker.getTypeAtLocation(declaration.name);
    if (type.getStringIndexType()) return checker.typeToString(type);
    const properties = type.getProperties().map((property) => {
      const value = checker.getTypeOfSymbolAtLocation(property, declaration);
      return `  ${property.name}: ${checker.typeToString(value, declaration, ts.TypeFormatFlags.NoTruncation)};`;
    });
    return properties.length ? `{\n${properties.join('\n')}\n}` : '{}';
  };
}
