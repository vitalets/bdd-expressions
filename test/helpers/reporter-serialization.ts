/**
 * Projects match arguments to the verified playwright-bdd reporter JSON contract.
 * Accepts either engine structurally, without invoking value transformers.
 */

interface ReportCapture {
  start: number | undefined;
  value: string | undefined;
  children: readonly ReportCapture[] | undefined;
}
interface ReportArgument {
  group: ReportCapture;
  parameterType: { name: string | undefined };
}
// Contract inspected in playwright-bdd@9.2.1:
// src/steps/matchedStepDefinition.ts, getStepMatchArguments/mapArgumentGroup.
// This mirrors the field projection so no playwright runtime is needed.
interface ReportGroup {
  start?: number;
  value?: string;
  children?: ReportGroup[];
}
/**
 * Serializes reporter fields while preserving no-match results.
 */
export function serialize(args: readonly ReportArgument[] | null) {
  if (args === null) return null;
  return JSON.parse(
    JSON.stringify(
      args.map((arg) => ({
        group: reportGroup(arg.group),
        parameterTypeName: arg.parameterType.name,
      })),
    ),
  );
}
function reportGroup(group: ReportCapture): ReportGroup {
  return { start: group.start, value: group.value, children: group.children?.map(reportGroup) };
}
