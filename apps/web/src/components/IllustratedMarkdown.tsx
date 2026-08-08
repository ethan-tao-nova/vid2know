import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import LazySceneImage from "./LazySceneImage";

/* ------------------------------------------------------------------ */
/* Slug helpers (shared between renderer and outline extraction)       */
/* ------------------------------------------------------------------ */

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[`*_~[\]()#>]/g, "")
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function makeSlugger() {
  const seen: Record<string, number> = {};
  return (text: string): string => {
    const base = slugify(text);
    const n = seen[base] ?? 0;
    seen[base] = n + 1;
    return n === 0 ? base : `${base}-${n}`;
  };
}

function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim();
}

export type Heading = { id: string; text: string; level: number };

/** Extract the heading outline from raw markdown (ids match the renderer). */
export function extractHeadings(md: string, maxLevel = 3): Heading[] {
  const slug = makeSlugger();
  const out: Heading[] = [];
  const lines = md.split(/\r?\n/);
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      const level = m[1].length;
      const text = stripInline(m[2]);
      const id = slug(m[2].trim());
      if (level <= maxLevel) out.push({ id, text, level });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Block model                                                         */
/* ------------------------------------------------------------------ */

type ListItem = {
  ordered: boolean;
  text: string;
  indent: number;
  children: ListItem[];
};

type Block =
  | { type: "heading"; level: number; text: string; id: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; lang: string; content: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "list"; items: ListItem[] }
  | { type: "table"; header: string[]; align: (string | null)[]; rows: string[][] }
  | { type: "hr" };

/* ------------------------------------------------------------------ */
/* Block parser                                                        */
/* ------------------------------------------------------------------ */

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function parseBlocks(md: string): Block[] {
  const slug = makeSlugger();
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Fenced code
    const fence = /^\s*```(.*)$/.exec(line);
    if (fence) {
      const lang = fence[1].trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: "code", lang, content: buf.join("\n") });
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const raw = h[2].trim();
      blocks.push({
        type: "heading",
        level: h[1].length,
        text: raw,
        id: slug(raw),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", lines: buf });
      continue;
    }

    // Table (header + separator)
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) => {
        const left = c.startsWith(":");
        const right = c.endsWith(":");
        if (left && right) return "center";
        if (right) return "right";
        if (left) return "left";
        return null;
      });
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, align, rows });
      continue;
    }

    // List
    if (listRe.test(line)) {
      const raw: { indent: number; ordered: boolean; text: string }[] = [];
      while (i < lines.length && listRe.test(lines[i])) {
        const m = listRe.exec(lines[i])!;
        raw.push({
          indent: m[1].length,
          ordered: /\d/.test(m[2]),
          text: m[3],
        });
        i++;
      }
      blocks.push({ type: "list", items: buildListTree(raw) });
      continue;
    }

    // Paragraph (gather until blank or a block starter)
    const para: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !listRe.test(lines[i]) &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: para.join("\n") });
  }

  return blocks;
}

function buildListTree(
  raw: { indent: number; ordered: boolean; text: string }[]
): ListItem[] {
  const roots: ListItem[] = [];
  const stack: ListItem[] = [];
  for (const r of raw) {
    const node: ListItem = {
      ordered: r.ordered,
      text: r.text,
      indent: r.indent,
      children: [],
    };
    while (stack.length && stack[stack.length - 1].indent >= r.indent) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }
  return roots;
}

/* ------------------------------------------------------------------ */
/* Inline renderer                                                     */
/* ------------------------------------------------------------------ */

const INLINE_RE =
  /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]*)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)/;

function renderInline(
  text: string,
  keyBase: string,
  resolveAsset: (src: string) => string
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let idx = 0;
  while (rest.length) {
    const m = INLINE_RE.exec(rest);
    if (!m) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const key = `${keyBase}-${idx++}`;
    if (m[1]) {
      nodes.push(
        <LazySceneImage key={key} src={resolveAsset(m[3])} alt={m[2]} caption={m[2]} />
      );
    } else if (m[4]) {
      nodes.push(
        <a key={key} href={m[6]} target="_blank" rel="noreferrer">
          {renderInline(m[5], key, resolveAsset)}
        </a>
      );
    } else if (m[7]) {
      nodes.push(<code key={key}>{m[8]}</code>);
    } else if (m[9]) {
      nodes.push(<strong key={key}>{renderInline(m[10], key, resolveAsset)}</strong>);
    } else if (m[11]) {
      nodes.push(<strong key={key}>{renderInline(m[12], key, resolveAsset)}</strong>);
    } else if (m[13]) {
      nodes.push(<em key={key}>{renderInline(m[14], key, resolveAsset)}</em>);
    } else if (m[15]) {
      nodes.push(<em key={key}>{renderInline(m[16], key, resolveAsset)}</em>);
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

function renderListItems(
  items: ListItem[],
  keyBase: string,
  resolveAsset: (src: string) => string
): ReactNode {
  // Group consecutive siblings by ordered flag.
  const groups: { ordered: boolean; items: ListItem[] }[] = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && last.ordered === it.ordered) last.items.push(it);
    else groups.push({ ordered: it.ordered, items: [it] });
  }
  return groups.map((g, gi) => {
    const inner = g.items.map((it, ii) => {
      const key = `${keyBase}-${gi}-${ii}`;
      return (
        <li key={key}>
          {renderInline(it.text, key, resolveAsset)}
          {it.children.length
            ? renderListItems(it.children, key, resolveAsset)
            : null}
        </li>
      );
    });
    return g.ordered ? (
      <ol key={`${keyBase}-ol-${gi}`}>{inner}</ol>
    ) : (
      <ul key={`${keyBase}-ul-${gi}`}>{inner}</ul>
    );
  });
}

function renderBlock(
  block: Block,
  key: string,
  resolveAsset: (src: string) => string
): ReactNode {
  switch (block.type) {
    case "heading": {
      const Tag = `h${Math.min(block.level, 4)}` as "h1" | "h2" | "h3" | "h4";
      return (
        <Tag key={key} id={block.id}>
          {renderInline(block.text, key, resolveAsset)}
        </Tag>
      );
    }
    case "paragraph":
      return <p key={key}>{renderInline(block.text, key, resolveAsset)}</p>;
    case "code":
      return (
        <pre key={key}>
          <code>{block.content}</code>
        </pre>
      );
    case "blockquote":
      return (
        <blockquote key={key}>
          {renderInline(block.lines.join("\n"), key, resolveAsset)}
        </blockquote>
      );
    case "hr":
      return <hr key={key} />;
    case "list":
      return (
        <div key={key}>{renderListItems(block.items, key, resolveAsset)}</div>
      );
    case "table":
      return (
        <table key={key}>
          <thead>
            <tr>
              {block.header.map((c, ci) => (
                <th
                  key={ci}
                  style={{ textAlign: (block.align[ci] as "left") || undefined }}
                >
                  {renderInline(c, `${key}-h${ci}`, resolveAsset)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((c, ci) => (
                  <td
                    key={ci}
                    style={{
                      textAlign: (block.align[ci] as "left") || undefined,
                    }}
                  >
                    {renderInline(c, `${key}-r${ri}c${ci}`, resolveAsset)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Lazy section wrapper                                                */
/* ------------------------------------------------------------------ */

function LazySection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(
    typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    if (visible || typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  return (
    <div
      className="md-lazy-section"
      ref={ref}
      style={visible ? undefined : { minHeight: 80 }}
    >
      {visible ? children : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

export default function IllustratedMarkdown({
  content,
  taskId,
  imageWidth = 480,
}: {
  content: string;
  taskId?: string;
  imageWidth?: number;
}) {
  const resolveAsset = (src: string): string => {
    if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
    if (taskId) {
      const params = new URLSearchParams({ path: src });
      if (imageWidth) params.set("w", String(imageWidth));
      return `/api/tasks/${taskId}/asset?${params.toString()}`;
    }
    return src;
  };

  const blocks = parseBlocks(content || "");

  // Headings render eagerly (stable anchors); other content is lazy-grouped.
  const out: ReactNode[] = [];
  let buffer: ReactNode[] = [];
  let sectionKey = 0;
  const flush = () => {
    if (buffer.length) {
      out.push(<LazySection key={`sec-${sectionKey++}`}>{buffer}</LazySection>);
      buffer = [];
    }
  };
  blocks.forEach((block, bi) => {
    if (block.type === "heading") {
      flush();
      out.push(renderBlock(block, `b-${bi}`, resolveAsset));
    } else {
      buffer.push(renderBlock(block, `b-${bi}`, resolveAsset));
    }
  });
  flush();

  return <div className="markdown-body">{out}</div>;
}
