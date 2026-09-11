// 违规样例：service 层 import 了 cli 层
// 期望 boundaries/dependencies 报错
import { renderRow } from "@/cli/render";

export interface ReportLine {
  label: string;
  value: string;
}

export function buildReport(lines: ReportLine[]): string {
  // 违规样例：嵌套三元，sonarjs 会报
  const header = lines.length === 0 ? "empty" : lines.length > 10 ? "large" : "normal";

  const body = lines.map((line) => renderRow(line.label, line.value)).join("\n");

  return `[${header}]\n${body}`;
}
