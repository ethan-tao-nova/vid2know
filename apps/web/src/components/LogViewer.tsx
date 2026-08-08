import { useEffect, useRef } from "react";
import { Empty } from "antd";
import { useT } from "../i18n/LocaleContext";

function levelClass(line: string): string {
  const lower = line.toLowerCase();
  if (/\b(error|err|traceback|exception|failed)\b/.test(lower)) {
    return "log-viewer__line--error";
  }
  if (/\b(warn|warning)\b/.test(lower)) return "log-viewer__line--warn";
  return "";
}

/** Simple monospace log line viewer with optional auto-scroll. */
export default function LogViewer({
  lines,
  autoScroll = true,
  height,
}: {
  lines: string[];
  autoScroll?: boolean;
  height?: number;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoScroll && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  if (!lines.length) {
    return <Empty description={t.logs.empty} />;
  }

  return (
    <div className="log-viewer" ref={ref} style={height ? { maxHeight: height } : undefined}>
      {lines.map((line, i) => (
        <div key={i} className={levelClass(line)}>
          {line || "\u00a0"}
        </div>
      ))}
    </div>
  );
}
