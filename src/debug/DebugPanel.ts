import { INPUT_TIMING, PHYSICS } from "../game/Physics";
import type { Box, MoveDef, MoveSet } from "../game/MoveData";
import { clearLogs, debug, type LogEntry } from "./DebugState";

// Dev-only playtest panel (vanilla DOM). Loaded through a dynamic import guarded by
// import.meta.env.DEV in main.ts, so it never ships in production builds.

type Sync = () => void;

const STYLE = `
#dbg { position: fixed; top: 0; right: 0; width: 340px; height: 100vh; overflow-y: auto; z-index: 10;
  background: rgba(10, 12, 24, 0.94); color: #cde; font: 12px/1.4 monospace; padding: 8px; box-sizing: border-box; }
#dbg[hidden] { display: none; }
#dbg h1 { font-size: 13px; margin: 0 0 6px; color: #ffd84a; }
#dbg details { border-top: 1px solid #2a3050; padding: 4px 0; }
#dbg details details { margin-left: 8px; }
#dbg summary { cursor: pointer; color: #7fdcff; }
#dbg .row { display: grid; grid-template-columns: 112px 1fr 48px; gap: 6px; align-items: center; margin: 2px 0; }
#dbg .row input[type=range] { width: 100%; margin: 0; }
#dbg .row .val { text-align: right; color: #fff; }
#dbg .btns { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; }
#dbg button, #dbg select { background: #1c2340; color: #cde; border: 1px solid #3a4470; font: inherit; padding: 2px 6px; }
#dbg button:hover { background: #2a3566; }
#dbg .hint { color: #778; margin: 4px 0; }
#dbg .log { height: 150px; overflow-y: auto; background: #070914; padding: 4px; margin: 2px 0 6px; white-space: pre; }
#dbg .log .dim { color: #778; } #dbg .log .ign { color: #ff9966; } #dbg .log .mv { color: #fff; }
#dbg .log .st { color: #7fdcff; } #dbg .log .hit { color: #ff6b6b; } #dbg .log .sta { color: #e6d36a; }
#dbg-badge { position: fixed; bottom: 6px; right: 6px; z-index: 10; background: rgba(10, 12, 24, 0.85); color: #7fdcff;
  font: 12px monospace; border: 1px solid #3a4470; padding: 2px 8px; cursor: pointer; }
`;

const PHYSICS_RANGES: Record<keyof typeof PHYSICS, [number, number, number]> = {
  gravity: [0, 6000, 50],
  groundFriction: [0, 8000, 100],
  groundRecoil: [0, 1, 0.01],
  wallBounce: [0, 1, 0.01],
  bodyBounce: [0, 1, 0.01],
  bounceMinSpeed: [0, 400, 5],
  knockdownTicks: [0, 120, 1],
  maxQueue: [1, 10, 1],
};

const INPUT_RANGES: Record<keyof typeof INPUT_TIMING, [number, number, number]> = {
  windowMs: [100, 3000, 50],
  simultaneousMs: [0, 100, 1],
};

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function section(parent: HTMLElement, title: string, open = true): HTMLElement {
  const d = h("details");
  d.open = open;
  d.append(h("summary", "", title));
  const body = h("div");
  d.append(body);
  parent.append(d);
  return body;
}

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(2));

function slider(
  parent: HTMLElement,
  syncs: Sync[],
  label: string,
  [min, max, step]: [number, number, number],
  get: () => number,
  set: (v: number) => void,
): void {
  const row = h("div", "row");
  const input = h("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  const out = h("span", "val");
  const sync = () => {
    const v = get();
    if (document.activeElement !== input) input.value = String(v);
    out.textContent = fmt(v);
  };
  input.addEventListener("input", () => {
    set(Number(input.value));
    out.textContent = fmt(get());
  });
  row.append(h("span", "", label), input, out);
  parent.append(row);
  syncs.push(sync);
  sync();
}

function checkbox(
  parent: HTMLElement,
  syncs: Sync[],
  label: string,
  get: () => boolean,
  set: (v: boolean) => void,
): void {
  const wrap = h("label");
  const input = h("input");
  input.type = "checkbox";
  input.addEventListener("change", () => set(input.checked));
  wrap.append(input, ` ${label}`);
  wrap.style.display = "block";
  parent.append(wrap);
  const sync = () => (input.checked = get());
  syncs.push(sync);
  sync();
}

function button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
  const b = h("button", "", label);
  b.addEventListener("click", onClick);
  parent.append(b);
  return b;
}

function select(parent: HTMLElement, options: string[], current: string, onChange: (v: string) => void): void {
  const s = h("select");
  for (const o of options) s.append(new Option(o, o, false, o === current));
  s.style.maxWidth = "100%";
  s.addEventListener("change", () => onChange(s.value));
  parent.append(s);
}

function boxesEditor(parent: HTMLElement, syncs: Sync[], title: string, boxes: Box[]): void {
  boxes.forEach((box, i) => {
    const body = section(parent, `${title} #${i + 1}`, true);
    slider(body, syncs, "x (forward)", [-250, 250, 1], () => box.x, (v) => (box.x = v));
    slider(body, syncs, "y (top)", [-300, 60, 1], () => box.y, (v) => (box.y = v));
    slider(body, syncs, "width", [1, 300, 1], () => box.w, (v) => (box.w = v));
    slider(body, syncs, "height", [1, 300, 1], () => box.h, (v) => (box.h = v));
  });
}

function moveEditor(parent: HTMLElement, syncs: Sync[], def: MoveDef): void {
  const nameRow = h("div", "row");
  nameRow.append(h("span", "", "name"));
  const nameInput = h("input");
  nameInput.type = "text";
  nameInput.value = def.name;
  nameInput.addEventListener("input", () => (def.name = nameInput.value));
  nameRow.append(nameInput);
  parent.append(nameRow);

  const req = h("div", "row");
  req.append(h("span", "", "requires"));
  select(req, ["grounded", "airborne", "any"], def.requires, (v) => (def.requires = v as MoveDef["requires"]));
  parent.append(req);

  if (def.velocity) {
    const v = def.velocity;
    if (v.x !== undefined) slider(parent, syncs, "velocity x", [-1500, 1500, 10], () => v.x ?? 0, (n) => (v.x = n));
    if (v.y !== undefined) slider(parent, syncs, "velocity y", [-2000, 500, 10], () => v.y ?? 0, (n) => (v.y = n));
  }

  if (def.hit) {
    const hit = def.hit;
    slider(parent, syncs, "damage", [0, 50, 1], () => hit.damage, (n) => (hit.damage = n));
    slider(parent, syncs, "hitstun (ticks)", [1, 120, 1], () => hit.hitstun, (n) => (hit.hitstun = n));
    slider(parent, syncs, "impulse x", [-1500, 1500, 10], () => hit.impulse.x, (n) => (hit.impulse.x = n));
    slider(parent, syncs, "impulse y", [-2500, 2500, 10], () => hit.impulse.y, (n) => (hit.impulse.y = n));
    checkbox(parent, syncs, "hits airborne", () => hit.hitsAirborne !== false, (b) => (hit.hitsAirborne = b));
  }

  def.frames.forEach((frame, i) => {
    const body = section(parent, `frame ${i + 1}${frame.hitboxes?.length ? " (active)" : ""}`, true);
    slider(body, syncs, "duration (ticks)", [1, 60, 1], () => frame.duration, (n) => (frame.duration = n));
    if (frame.hurtboxes) boxesEditor(body, syncs, "hurtbox", frame.hurtboxes);
    if (frame.hitboxes) boxesEditor(body, syncs, "hitbox", frame.hitboxes);
  });

  if (def.cancelable?.length) {
    const body = section(parent, "cancel windows (% from end)", true);
    for (const c of def.cancelable) {
      slider(body, syncs, `into ${c.move}`, [0, 100, 1], () => c.percent, (n) => (c.percent = n));
    }
  }
}

function classify(text: string): string {
  if (text.startsWith("press")) return text.includes("ignored") ? "ign" : "dim";
  if (text.startsWith("move")) return "mv";
  if (text.startsWith("start")) return "st";
  if (text.startsWith("hit") || text.startsWith("got hit")) return "hit";
  return "sta";
}

function renderLog(pre: HTMLElement, log: LogEntry[]): void {
  const stick = pre.scrollTop + pre.clientHeight >= pre.scrollHeight - 4;
  pre.replaceChildren();
  for (const e of log) {
    const line = h("div", classify(e.text), `${String(e.tick).padStart(5)}  ${e.text}`);
    pre.append(line);
  }
  if (stick) pre.scrollTop = pre.scrollHeight;
}

async function copy(text: string, status: HTMLElement, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = `Copied ${what} to clipboard.`;
  } catch {
    console.log(text);
    status.textContent = `Clipboard unavailable - ${what} printed to the console.`;
  }
}

export function mountDebugPanel(): void {
  const style = h("style");
  style.textContent = STYLE;
  document.head.append(style);

  const panel = h("div");
  panel.id = "dbg";
  panel.hidden = true;
  panel.append(h("h1", "", "PLAYTEST TOOLS  ( ` toggles )"));

  const badge = h("div", "", "` playtest tools");
  badge.id = "dbg-badge";
  document.body.append(panel, badge);

  const setVisible = (v: boolean) => {
    panel.hidden = !v;
    badge.hidden = v;
  };
  badge.addEventListener("click", () => setVisible(true));

  const staticSyncs: Sync[] = [];
  const fighterSyncs: Sync[] = [];
  const moveSyncs: Sync[] = [];
  const status = h("div", "hint");

  // --- Simulation controls
  const sim = section(panel, "Simulation  (P pause, . step, B boxes, R restart)");
  checkbox(sim, staticSyncs, "show hit/hurt/body boxes (B)", () => debug.boxes, (v) => (debug.boxes = v));
  checkbox(sim, staticSyncs, "pause (P)", () => debug.paused, (v) => (debug.paused = v));
  checkbox(sim, staticSyncs, "endless round (no K.O./timer)", () => debug.endless, (v) => (debug.endless = v));
  slider(sim, staticSyncs, "time scale", [0.05, 2, 0.05], () => debug.timeScale, (v) => (debug.timeScale = v));
  const simBtns = h("div", "btns");
  const step = () => {
    debug.paused = true;
    debug.stepRequests++;
  };
  const restart = () => debug.target?.restart();
  button(simBtns, "Step 1 tick (.)", step);
  button(simBtns, "Restart round (R)", restart);
  button(simBtns, "Clear log", clearLogs);
  sim.append(simBtns);

  // --- Physics + input timing
  const phys = section(panel, "Physics");
  for (const key of Object.keys(PHYSICS) as (keyof typeof PHYSICS)[]) {
    slider(phys, staticSyncs, key, PHYSICS_RANGES[key], () => PHYSICS[key], (v) => (PHYSICS[key] = v));
  }
  const timing = section(panel, "Input timing");
  for (const key of Object.keys(INPUT_TIMING) as (keyof typeof INPUT_TIMING)[]) {
    slider(timing, staticSyncs, key, INPUT_RANGES[key], () => INPUT_TIMING[key], (v) => (INPUT_TIMING[key] = v));
  }
  const defaults = { physics: { ...PHYSICS }, timing: { ...INPUT_TIMING } };
  const tuneBtns = h("div", "btns");
  button(tuneBtns, "Reset physics + timing", () => {
    Object.assign(PHYSICS, defaults.physics);
    Object.assign(INPUT_TIMING, defaults.timing);
  });
  button(tuneBtns, "Copy tuning JSON", () => {
    const masses = debug.target?.characters.map((c) => ({ id: c.id, mass: c.mass }));
    void copy(JSON.stringify({ PHYSICS, INPUT_TIMING, masses }, null, 2), status, "tuning values");
  });
  timing.append(tuneBtns);

  // --- Fighters (rebuilt whenever a new fight starts)
  const fighterBody = section(panel, "Fighters");
  const renderFighters = () => {
    fighterBody.replaceChildren();
    fighterSyncs.length = 0;
    const target = debug.target;
    if (!target) {
      fighterBody.append(h("div", "hint", "Start a fight to use these."));
      return;
    }
    target.fighters.forEach((f, i) => {
      slider(fighterBody, fighterSyncs, `P${i + 1} ${f.name} mass`, [0.25, 5, 0.05], () => f.mass, (v) => {
        f.mass = v;
        const c = target.characters[i];
        if (c) c.mass = v; // kept for restarts
      });
    });
  };

  // --- Move editor (rebuilt on selection change and new fights)
  const moveBody = section(panel, "Move editor (live)");
  let selSet = 0;
  let selKey = "";
  const renderMoveEditor = () => {
    moveBody.replaceChildren();
    moveSyncs.length = 0;
    const target = debug.target;
    const sets: MoveSet[] = target ? [...new Set(target.fighters.map((f) => f.moveset))] : [];
    const set = sets[Math.min(selSet, sets.length - 1)];
    if (!set) {
      moveBody.append(h("div", "hint", "Start a fight to edit moves."));
      return;
    }
    const keys = [...Object.keys(set.stances).map((k) => `stance:${k}`), ...Object.keys(set.moves)];
    if (!keys.includes(selKey)) selKey = keys[0] ?? "";

    const pick = h("div", "btns");
    if (sets.length > 1) {
      select(pick, sets.map((s) => s.name), set.name, (v) => {
        selSet = Math.max(0, sets.findIndex((s) => s.name === v));
        renderMoveEditor();
      });
    }
    select(pick, keys, selKey, (v) => {
      selKey = v;
      renderMoveEditor();
    });
    button(pick, "Copy move set JSON", () => void copy(JSON.stringify(set, null, 2), status, `move set "${set.name}"`));
    moveBody.append(pick);
    moveBody.append(h("div", "hint", "Edits are live and shared by every fighter using this move set. Copy the JSON into src/data/movesets to keep them."));

    if (selKey.startsWith("stance:")) {
      const stance = set.stances[selKey.slice(7) as keyof MoveSet["stances"]];
      if (stance) boxesEditor(moveBody, moveSyncs, "hurtbox", stance.hurtboxes);
    } else {
      const def = set.moves[selKey as keyof MoveSet["moves"]];
      if (def) moveEditor(moveBody, moveSyncs, def);
    }
  };

  // --- Input / event logs
  const logBody = section(panel, "Input & event log");
  const logPres = [0, 1].map((i) => {
    logBody.append(h("div", "hint", `Player ${i + 1}  (tick  event)`));
    const pre = h("div", "log");
    logBody.append(pre);
    return pre;
  });

  panel.append(status);

  // Controls hand focus back so game keys keep working after using the panel.
  const release = () => (document.activeElement as HTMLElement | null)?.blur();
  panel.addEventListener("change", release);
  panel.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).tagName === "BUTTON") release();
  });
  panel.addEventListener("pointerup", (e) => {
    if ((e.target as HTMLInputElement).type === "range") release();
  });

  window.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
    if (e.code === "Backquote") setVisible(Boolean(panel.hidden));
    else if (e.code === "Period") step();
    else if (e.repeat) return;
    else if (e.code === "KeyP") debug.paused = !debug.paused;
    else if (e.code === "KeyB") debug.boxes = !debug.boxes;
    else if (e.code === "KeyR") restart();
  });

  let lastTarget = debug.target;
  let lastLogVersion = -1;
  renderFighters();
  renderMoveEditor();
  const frame = () => {
    requestAnimationFrame(frame);
    if (panel.hidden) return;
    if (debug.target !== lastTarget) {
      lastTarget = debug.target;
      renderFighters();
      renderMoveEditor();
    }
    for (const list of [staticSyncs, fighterSyncs, moveSyncs]) for (const s of list) s();
    if (debug.logVersion !== lastLogVersion) {
      lastLogVersion = debug.logVersion;
      logPres.forEach((pre, i) => renderLog(pre, debug.logs[i] ?? []));
    }
  };
  frame();
}
