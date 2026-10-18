import { getMoveSet } from "../data/movesets";
import type { Renderer } from "../rendering/Renderer";
import { resolveHits } from "./Combat";
import { Fighter } from "./Fighter";
import { InputManager } from "./Input";
import { MenuNav } from "./MenuNav";
import { MoveInput } from "./MoveInput";
import { STEP } from "./Physics";
import type { Scene, Session } from "./Scene";

const KO_DELAY = 1.5;

export class FightScene implements Scene {
  private fighters: [Fighter, Fighter] | null = null;
  private moveInputs: MoveInput[] = [];
  private input?: InputManager;
  private nav?: MenuNav;
  private winner: number | null = null;
  private koTimer = 0;
  private accumulator = 0;

  constructor(private session: Session) {}

  enter(): void {
    const [c1, c2] = this.session.characters;
    const a = new Fighter(240, c1.color, c1.name, getMoveSet(c1.moveset));
    const b = new Fighter(720, c2.color, c2.name, getMoveSet(c2.moveset));
    b.facing = -1;
    this.fighters = [a, b];
    this.winner = null;
    this.koTimer = 0;
    this.accumulator = 0;

    this.moveInputs = this.fighters.map((f) => new MoveInput((move) => f.enqueue(move)));
    this.input = new InputManager(this.session.settings.devices, (p) => this.fighters?.[p]?.facing ?? 1);
    this.input.onInput(({ player, action, pressed }) => {
      const f = this.fighters?.[player];
      // Presses are ignored while stunned, and the match is over after a K.O.
      if (!pressed || !f || f.stunned || this.winner !== null) return;
      this.moveInputs[player]?.press(action);
    });
    // Keyboard only, so a stray gamepad button can't abandon a match.
    this.nav = new MenuNav((k) => k === "back" && this.session.go("main-menu"), false);
  }

  exit(): void {
    this.input?.dispose();
    this.nav?.dispose();
  }

  update(dt: number): void {
    this.input?.poll();
    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      this.tick();
    }
    if (this.winner !== null) {
      this.koTimer += dt;
      if (this.koTimer >= KO_DELAY) {
        this.session.winner = this.winner;
        this.session.go("results");
      }
    }
  }

  private tick(): void {
    if (!this.fighters) return;
    const [a, b] = this.fighters;
    // Facing is part of the simulation: it only flips while a fighter is free and
    // grounded, so crossing over mid-jump keeps towards/away consistent.
    if (a.canTurn) a.facing = b.x >= a.x ? 1 : -1;
    if (b.canTurn) b.facing = a.x >= b.x ? 1 : -1;

    a.tick();
    b.tick();

    if (this.winner !== null) return;
    for (const i of resolveHits(this.fighters)) {
      // Getting hit cancels any half-entered command.
      this.moveInputs[i]?.reset();
    }
    const dead = this.fighters.findIndex((f) => f.health <= 0);
    if (dead >= 0) this.winner = 1 - dead;
  }

  render(r: Renderer): void {
    r.stage();
    this.fighters?.forEach((f, i) => {
      const pending = this.moveInputs[i]?.pending();
      const top = f.current?.name ?? (f.stunned ? f.state : "");
      const queued = [...(pending ? [`${pending} ...`] : []), ...f.queue].join(" > ");
      r.fighter(f, top, queued);
      r.healthBar(f, i === 0 ? "left" : "right");
    });
    if (this.winner !== null) r.text("K.O.!", r.width / 2, r.height / 2 - 60, { size: 80, color: "#ffd84a" });
    r.text("Esc: quit to menu", r.width / 2, r.height - 12, { size: 14, color: "#778" });
  }
}
