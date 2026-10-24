/* .flow → Mermaid. One kind per node decides both its shape and its colour, so every diagram follows the same legend. */

/** kind → Mermaid shape, colours and the words used in the legend. */
export const KINDS = {
  start: { shape: "stadium", fill: "#1F5C4B", stroke: "#174638", color: "#FFFFFF", bold: true, name: "Start", means: "Where the flow begins: a sidebar click, a link, an event" },
  end: { shape: "stadium", fill: "#DDEFE3", stroke: "#2E7D4F", color: "#14502F", bold: true, name: "End (done)", means: "The flow finishes normally" },
  endx: { shape: "stadium", fill: "#FBE3E0", stroke: "#C0392B", color: "#7A1F16", bold: true, name: "End (stopped)", means: "The flow stops: blocked, declined, cancelled, nothing to do" },
  screen: { shape: "curv-trap", fill: "#FFFDF8", stroke: "#1F5C4B", color: "#1C2B25", width: 2, name: "Screen", means: "A page the person sees" },
  overlay: { shape: "win-pane", fill: "#F1F7F3", stroke: "#1F5C4B", color: "#1C2B25", dash: "5 3", width: 2, name: "Pop-up", means: "A drawer, modal, menu or panel on top of a screen" },
  click: { shape: "trap-t", fill: "#DCEBFA", stroke: "#2F6DB5", color: "#12365F", name: "Person clicks", means: "A person's click, tap, key press or signature" },
  input: { shape: "lean-r", fill: "#E4E7FF", stroke: "#4C5FD5", color: "#1D2670", name: "Person enters", means: "A person types, picks, drops or uploads something" },
  process: { shape: "rect", fill: "#EEF0EE", stroke: "#7A857F", color: "#26302B", name: "System step", means: "What the app does: validate, calculate, update the screen" },
  agent: { shape: "hex", fill: "#EEE5FA", stroke: "#7A4FC2", color: "#341A63", name: "FLO / agent", means: "Automated work by FLO or one of the agents (Reader, Scribe, ...)" },
  decision: { shape: "diam", fill: "#FFF0CC", stroke: "#D9962B", color: "#5C3B00", name: "Decision", means: "A yes/no or multi-way branch; every exit is labelled" },
  store: { shape: "cyl", fill: "#D5F0EA", stroke: "#1C8E7B", color: "#0B4A3F", name: "Data saved", means: "A record is created or changed (case, request, referral, mapping, rule)" },
  doc: { shape: "doc", fill: "#F6E9DC", stroke: "#B07A4C", color: "#4A2E14", name: "Document", means: "A letter, brief, report, appeal, form or file produced or read" },
  ext: { shape: "st-rect", fill: "#FFE6D2", stroke: "#E07B39", color: "#6B2F06", name: "Outside party", means: "Payer, referrer, EMR or portal: something outside Psyflo acts" },
  wait: { shape: "delay", fill: "#E4E8EE", stroke: "#6B7C93", color: "#26303D", name: "Wait", means: "Time passes or the flow waits on someone" },
  toast: { shape: "odd", fill: "#FFF9DB", stroke: "#C9A400", color: "#5A4A00", name: "Message", means: "A toast, banner or notification the person sees" },
  goto: { shape: "subproc", fill: "#FFFFFF", stroke: "#1F5C4B", color: "#1F5C4B", dash: "5 3", name: "Continues elsewhere", means: "Jumps to another diagram; the label names it" },
};

const NODE_RE = new RegExp(`^(${Object.keys(KINDS).join("|")})\\s+([A-Za-z][A-Za-z0-9_]*)\\s+"(.*)"\\s*$`);
const ARROW_RE = /(-->|-\.->|==>|---|-\.-|~~~)/;

const esc = (s) => s.replace(/"/g, "#quot;").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\\n/g, "<br/>");
/** A two-line label gets a bold first line: the screen or step name, then its detail. */
const boldFirst = (s) => (/\\n/.test(s) && !s.includes("**") ? s.replace(/^(.*?)\\n/, "**$1**\\n") : s);

/** Mermaid's own init block, shared by every diagram. */
export const INIT = {
  theme: "base",
  themeVariables: {
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    fontSize: "15px",
    lineColor: "#5B6B63",
    primaryTextColor: "#1C2B25",
    clusterBkg: "#FBF8F3",
    clusterBorder: "#D9CDBB",
    edgeLabelBackground: "#FFFFFF",
  },
  flowchart: { curve: "basis", nodeSpacing: 36, rankSpacing: 48, padding: 12, htmlLabels: true, useMaxWidth: false, wrappingWidth: 230 },
};

/** Parse the front matter and body of a .flow file. Throws with the line number on any mistake. */
export function compileFlow(text, file = "flow") {
  const lines = text.split(/\r?\n/);
  const meta = { title: "", route: "", intro: "", dir: "TD", also: "" };
  const nodes = new Map();
  const out = [];
  const groups = [];
  const groupIds = [];
  const refs = [];
  const fail = (n, msg) => {
    throw new Error(`${file}:${n + 1}: ${msg}\n    ${lines[n]}`);
  };
  let body = false;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("%%") || line.startsWith("#")) return;
    if (!body) {
      if (line === "---") {
        body = true;
        return;
      }
      const m = line.match(/^(title|route|intro|dir|also):\s*(.*)$/);
      if (!m) fail(i, "front matter must be  title: / route: / intro: / dir: / also:  then a --- line");
      meta[m[1]] = m[2].trim();
      return;
    }
    let m = line.match(NODE_RE);
    if (m) {
      const [, kind, id, label] = m;
      if (nodes.has(id)) fail(i, `node id "${id}" is declared twice`);
      if (/["`]/.test(label.replace(/\\"/g, ""))) fail(i, "labels cannot contain double quotes; use single quotes");
      nodes.set(id, { kind, label });
      out.push(`  ${id}@{ shape: ${KINDS[kind].shape}, label: "${esc(boldFirst(label))}" }`);
      return;
    }
    m = line.match(/^group\s+([A-Za-z][A-Za-z0-9_]*)\s+"(.*)"\s*$/);
    if (m) {
      groups.push(m[1]);
      groupIds.push(m[1]);
      out.push(`  subgraph ${m[1]} ["${esc(m[2])}"]`);
      return;
    }
    if (line === "endgroup") {
      if (!groups.pop()) fail(i, "endgroup without a group");
      out.push("  end");
      return;
    }
    if (ARROW_RE.test(line)) {
      /* Quote every edge label so punctuation cannot break the parser. */
      const fixed = line.replace(/\|([^|]*)\|/g, (_, t) => `|"${esc(t.trim())}"|`);
      const ids = line
        .replace(/\|[^|]*\|/g, " ")
        .split(ARROW_RE)
        .filter((_, k) => k % 2 === 0)
        .flatMap((s) => s.split("&"))
        .map((s) => s.trim())
        .filter(Boolean);
      ids.forEach((id) => refs.push([id, i]));
      out.push(`  ${fixed}`);
      return;
    }
    fail(i, 'not a node ("kind id \\"label\\""), group, endgroup or edge line');
  });
  if (!body) throw new Error(`${file}: missing the --- line after the front matter`);
  if (groups.length) throw new Error(`${file}: group "${groups.at(-1)}" is never closed with endgroup`);
  if (!meta.title) throw new Error(`${file}: title: is required`);
  if (!["TD", "LR"].includes(meta.dir)) throw new Error(`${file}: dir: must be TD or LR`);
  for (const [id, n] of refs) if (!nodes.has(id)) fail(n, `edge uses "${id}", which is not declared`);

  /* Every node should be reachable: a node with no edge at all is almost always a typo. */
  const used = new Set(refs.map(([id]) => id));
  const lonely = [...nodes.keys()].filter((id) => !used.has(id));
  if (lonely.length) throw new Error(`${file}: nodes with no edge: ${lonely.join(", ")}`);

  const classDefs = Object.entries(KINDS).map(([k, v]) => `  classDef k_${k} fill:${v.fill},stroke:${v.stroke},color:${v.color},stroke-width:${v.width ?? 1.5}px${v.dash ? `,stroke-dasharray:${v.dash}` : ""}${v.bold ? ",font-weight:600" : ""}`);
  const byKind = {};
  for (const [id, n] of nodes) (byKind[n.kind] ??= []).push(id);
  const classes = Object.entries(byKind).map(([k, ids]) => `  class ${ids.join(",")} k_${k}`);
  const groupStyles = groupIds.map((g) => `  style ${g} fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63`);
  const mermaid = [`%%{init: ${JSON.stringify(INIT)} }%%`, `flowchart ${meta.dir}`, ...classDefs, ...out, ...classes, ...groupStyles].join("\n");
  const count = Object.fromEntries(Object.entries(byKind).map(([k, ids]) => [k, ids.length]));
  return { meta, mermaid, nodes: nodes.size, edges: refs.length, count };
}
