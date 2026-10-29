import type { WfEdge, WfNode } from "./types";

/* Auto layout: layered, top to bottom (or left to right, with `direction: "LR"`), deterministic, no dependency.
   Nodes are placed in layers by their longest path from a root (Start and triggers), a loop is broken at its back edge, and the order inside a layer follows the order
   of the connections above it, so lines cross as little as a few sweeps can manage. The same graph always gives the same positions. */

/** The size a node is drawn at (the builder draws 244 by 112), so the gaps below are gaps between cards. */
export const NODE_W = 244;
export const NODE_H = 112;

export interface LayoutOptions {
  direction?: "LR" | "TB";
  gapX?: number;
  gapY?: number;
  /** Where the first layer starts. */
  origin?: { x: number; y: number };
}

export function autoLayout(nodes: WfNode[], edges: WfEdge[], opts: LayoutOptions = {}): WfNode[] {
  if (!nodes.length) return nodes;
  const dir = opts.direction ?? "TB";
  const gapX = opts.gapX ?? (dir === "TB" ? 56 : 88);
  const gapY = opts.gapY ?? (dir === "TB" ? 84 : 48);
  const origin = opts.origin ?? { x: 40, y: 40 };
  const ids = nodes.map((n) => n.id);
  const known = new Set(ids);
  const index = new Map(ids.map((id, i) => [id, i]));
  const usable = edges.filter((e) => known.has(e.from) && known.has(e.to) && e.from !== e.to);
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  const inn = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of usable) {
    out.get(e.from)?.push(e.to);
    inn.get(e.to)?.push(e.from);
  }

  /* Break loops: a depth-first walk from the roots drops every edge that points back into the walk. */
  const kindOf = new Map(nodes.map((n) => [n.id, n.kind]));
  const isRoot = (id: string) => kindOf.get(id) === "start" || (inn.get(id)?.length ?? 0) === 0;
  const roots = ids.filter(isRoot).sort((a, b) => (kindOf.get(a) === "start" ? -1 : 0) - (kindOf.get(b) === "start" ? -1 : 0) || (index.get(a) ?? 0) - (index.get(b) ?? 0));
  const state = new Map<string, 0 | 1 | 2>();
  const back = new Set<string>();
  const walk = (id: string) => {
    state.set(id, 1);
    for (const to of out.get(id) ?? []) {
      const s = state.get(to) ?? 0;
      if (s === 1) back.add(`${id}>${to}`);
      else if (s === 0) walk(to);
    }
    state.set(id, 2);
  };
  for (const r of [...roots, ...ids]) if (!state.get(r)) walk(r);
  const forward = usable.filter((e) => !back.has(`${e.from}>${e.to}`));
  const fout = new Map<string, string[]>(ids.map((id) => [id, []]));
  const fin = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of forward) {
    fout.get(e.from)?.push(e.to);
    fin.get(e.to)?.push(e.from);
  }

  /* Layers: the longest path from a node with nothing before it. */
  const layer = new Map<string, number>();
  const level = (id: string): number => {
    const known2 = layer.get(id);
    if (known2 !== undefined) return known2;
    layer.set(id, 0);
    const l = (fin.get(id) ?? []).reduce((m, p) => Math.max(m, level(p) + 1), 0);
    layer.set(id, l);
    return l;
  };
  for (const id of ids) level(id);
  const count = Math.max(...ids.map((id) => layer.get(id) ?? 0)) + 1;
  const layers: string[][] = Array.from({ length: count }, () => []);
  for (const id of ids) layers[layer.get(id) ?? 0].push(id);
  for (const l of layers) l.sort((a, b) => (index.get(a) ?? 0) - (index.get(b) ?? 0));

  /* Order inside a layer: the average position of what leads into a node (down), then of what it leads to (up). A few sweeps are enough for a process of this size. */
  const pos = new Map<string, number>();
  const settle = () => layers.forEach((l) => l.forEach((id, i) => pos.set(id, i)));
  settle();
  const bary = (id: string, near: Map<string, string[]>): number => {
    const ns = near.get(id) ?? [];
    return ns.length ? ns.reduce((s, n) => s + (pos.get(n) ?? 0), 0) / ns.length : (pos.get(id) ?? 0);
  };
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let i = 1; i < layers.length; i++) {
      layers[i].sort((a, b) => bary(a, fin) - bary(b, fin) || (index.get(a) ?? 0) - (index.get(b) ?? 0));
      settle();
    }
    for (let i = layers.length - 2; i >= 0; i--) {
      layers[i].sort((a, b) => bary(a, fout) - bary(b, fout) || (index.get(a) ?? 0) - (index.get(b) ?? 0));
      settle();
    }
  }

  /* Coordinates: each layer is centred on the tallest one, so a single path runs straight. */
  const along = dir === "LR" ? NODE_W + gapX : NODE_H + gapY;
  const across = dir === "LR" ? NODE_H + gapY : NODE_W + gapX;
  const widest = Math.max(...layers.map((l) => l.length));
  const at = new Map<string, { x: number; y: number }>();
  layers.forEach((l, li) => {
    const shift = ((widest - l.length) * across) / 2;
    l.forEach((id, i) => {
      const a = li * along;
      const c = i * across + shift;
      at.set(id, dir === "LR" ? { x: origin.x + a, y: origin.y + c } : { x: origin.x + c, y: origin.y + a });
    });
  });
  return nodes.map((n) => {
    const p = at.get(n.id);
    return p ? { ...n, x: Math.round(p.x), y: Math.round(p.y) } : n;
  });
}
