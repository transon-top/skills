import { formatDuration, parseDuration } from "@/lib/parse-duration";
import { buildReport } from "@/services/report-service";

export function run(argv: string[]): string {
  const seconds = parseDuration(argv[0] ?? "0");
  return buildReport([{ label: "duration", value: formatDuration(seconds) }]);
}
