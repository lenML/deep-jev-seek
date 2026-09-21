import { Highlight, type PrismTheme } from "prism-react-renderer";

import { cn } from "@/lib/utils";

const jsonTheme: PrismTheme = {
  plain: {
    backgroundColor: "transparent",
    color: "var(--foreground)",
  },
  styles: [
    { types: ["property"], style: { color: "var(--signal)" } },
    { types: ["string"], style: { color: "#7dd3fc" } },
    { types: ["number", "boolean"], style: { color: "#fbbf24" } },
    { types: ["null", "punctuation"], style: { color: "var(--muted-foreground)" } },
  ],
};

interface JsonHighlightProps {
  code: string;
  className?: string;
}

export function JsonHighlight({ code, className }: JsonHighlightProps) {
  return (
    <Highlight code={code} language="json" theme={jsonTheme}>
      {({ className: prismClassName, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={cn(
            "editor-scroll min-h-full rounded-md border border-border bg-card p-4 font-mono text-xs leading-5",
            prismClassName,
            className,
          )}
          style={{ ...style, backgroundColor: "transparent" }}
        >
          {tokens.map((line, lineIndex) => (
            <div key={lineIndex} {...getLineProps({ line })} className="table-row">
              <span
                aria-hidden="true"
                className="text-muted-foreground/45 table-cell select-none pr-4 text-right"
              >
                {String(lineIndex + 1).padStart(2, " ")}
              </span>
              <span className="table-cell">
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </span>
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
