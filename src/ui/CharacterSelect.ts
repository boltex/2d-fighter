import { CHARACTERS } from "../game/Characters";
import { InputManager } from "../game/Input";
import { MenuNav } from "../game/MenuNav";
import type { Scene, Session } from "../game/Scene";
import type { Renderer } from "../rendering/Renderer";

const START_DELAY = 0.6;

interface Cursor {
  index: number;
  locked: boolean;
}

// Each player drives their own cursor with their assigned device:
// up/down browse, towards locks in, away unlocks.
export class CharacterSelect implements Scene {
  private cursors: Cursor[] = [];
  private input?: InputManager;
  private nav?: MenuNav;
  private startTimer = 0;

  constructor(private session: Session) {}

  enter(): void {
    this.cursors = [
      { index: 0, locked: false },
      { index: 1, locked: false },
    ];
    this.startTimer = 0;
    // In menus player 1 faces right and player 2 faces left.
    this.input = new InputManager(this.session.settings.devices, (p) => (p === 0 ? 1 : -1));
    this.input.onInput(({ player, action, pressed }) => {
      if (pressed) this.handle(player, action);
    });
    this.nav = new MenuNav((k) => k === "back" && this.session.go("main-menu"), false);
  }

  exit(): void {
    this.input?.dispose();
    this.nav?.dispose();
  }

  private handle(player: number, action: string): void {
    const cur = this.cursors[player];
    const other = this.cursors[1 - player];
    if (!cur || !other || this.startTimer > 0) return;
    const n = CHARACTERS.length;
    if (action === "towards") {
      if (!(other.locked && other.index === cur.index)) cur.locked = true;
    } else if (action === "away") {
      cur.locked = false;
    } else if (!cur.locked) {
      cur.index = (cur.index + (action === "up" ? n - 1 : 1)) % n;
    }
  }

  update(dt: number): void {
    this.input?.poll();
    this.nav?.poll();
    if (this.startTimer > 0) {
      this.startTimer -= dt;
      if (this.startTimer <= 0) {
        const [a, b] = this.cursors;
        const [c1, c2] = [CHARACTERS[a?.index ?? 0], CHARACTERS[b?.index ?? 1]];
        if (c1 && c2) this.session.characters = [c1, c2];
        this.session.go("fight");
      }
    } else if (this.cursors.every((c) => c.locked)) {
      this.startTimer = START_DELAY;
    }
  }

  render(r: Renderer): void {
    r.clear();
    r.text("CHOOSE YOUR FIGHTER", r.width / 2, 80, { size: 48, color: "#ffd84a" });
    CHARACTERS.forEach((c, i) => {
      const y = 170 + i * 70;
      r.ctx.fillStyle = c.color;
      r.ctx.fillRect(r.width / 2 - 150, y - 28, 40, 40);
      r.text(c.name, r.width / 2 - 90, y + 4, { align: "left", size: 28 });
      this.cursors.forEach((cur, p) => {
        if (cur.index !== i) return;
        const color = p === 0 ? "#e74c3c" : "#3498db";
        const tag = `P${p + 1}${cur.locked ? " READY" : ""}`;
        if (p === 0) r.text(`${tag} >`, r.width / 2 - 190, y + 4, { align: "right", color });
        else r.text(`< ${tag}`, r.width / 2 + 190, y + 4, { align: "left", color });
      });
    });
    r.text("Up/Down: browse   Towards: lock in   Away: undo   Esc: menu", r.width / 2, r.height - 12, {
      size: 14,
      color: "#778",
    });
  }
}
