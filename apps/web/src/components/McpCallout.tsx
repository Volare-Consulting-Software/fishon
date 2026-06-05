import { Info, ExternalLink } from "lucide-react";
import { CopyButton } from "./CopyButton";

const NPM_URL =
  "https://www.npmjs.com/package/@volare-consulting/fishon";
const INSTALL_CMD =
  "claude mcp add fishon -- npx -y @volare-consulting/fishon --mcp";

export function McpCallout() {
  return (
    <div className="rounded-xl border border-line bg-raised p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        <Info className="h-4 w-4 text-brand" /> About the AI-suggested plan
      </div>
      <p className="text-sm text-ink-2">
        AI-suggested plans — including the best window, target species, and{" "}
        <strong>how-to-catch tips</strong> (bait/technique) for the fish you
        choose — are a <strong>work in progress</strong>, so treat them as a
        starting point, not gospel. When no AI key is configured, a
        deterministic conditions score (waves, wind, rain, moon) is used
        instead. The same real data this app uses (forecast, tides, nearby spots
        &amp; structures, and local species) is also available as an open{" "}
        <strong>MCP server</strong> you can use directly in Claude Code:
      </p>

      <a
        href={NPM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        @volare-consulting/fishon
      </a>

      <div className="mt-3">
        <div className="mb-1 text-xs text-ink-3">Install in Claude Code:</div>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-sunken px-3 py-2">
          <code className="overflow-x-auto text-xs text-ink">{INSTALL_CMD}</code>
          <CopyButton value={INSTALL_CMD} />
        </div>
      </div>
    </div>
  );
}
