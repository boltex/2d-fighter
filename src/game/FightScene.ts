import { getMoveSet } from "../data/movesets";
import type { Renderer } from "../rendering/Renderer";
import { resolveHits } from "./Combat";
import { Fighter } from "./Fighter";
import { InputManager } from "./Input";
import { MenuNav } from "./MenuNav";
import { MoveInput } from "./MoveInput";
import { STEP, TICKS_PER_SECOND } from "./Physics";
import type { Scene, Session } from "./Scene";

const ROUND_SECONDS = 60;
const END_DELAY_TICKS = Math.round(1.5 * TICKS_PER_SECOND);

export class FightScene implements Scene {
  private fighters: [Fighter, Fighter] | null = null;
  private moveInputs: MoveInput[] = [];
  private input?: InputManager;
  private nav?: MenuNav;
  // Set once the round is decided; null winner means a draw.
  private ended = false;
  private result: number | null = null;
  private banner = "";
  private timeLeft = ROUND_SECONDS * TICKS_PER_SECOND;
  private endTimer = 0;
  private accumulator = 0;

  constructor(private session: Session) { }

  enter(): void {
    const [c1, c2] = this.session.characters;
    const a = new Fighter(240, c1.color, c1.name, getMoveSet(c1.moveset), c1.mass);
    const b = new Fighter(720, c2.color, c2.name, getMoveSet(c2.moveset), c2.mass);
    b.facing = -1;
    this.fighters = [a, b];
    this.ended = false;
    this.result = null;
    this.banner = "";
    this.timeLeft = ROUND_SECONDS * TICKS_PER_SECOND;
    this.endTimer = 0;
    this.accumulator = 0;

    this.moveInputs = this.fighters.map((f) => new MoveInput((move) => f.enqueue(move)));
    this.input = new InputManager(this.session.settings.devices, (p) => this.fighters?.[p]?.facing ?? 1);
    this.input.onInput(({ player, action, pressed }) => {
      const f = this.fighters?.[player];
      // Presses are ignored while stunned, and once the round has been decided.
      if (!pressed || !f || f.stunned || this.ended) return;
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

    for (const i of resolveHits(this.fighters)) {
      // Getting hit cancels any half-entered command.
      this.moveInputs[i]?.reset();
    }

    if (!this.ended) {
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      this.checkRoundEnd(a, b);
    } else if (this.finishersDone()) {
      // The small end-of-round pause only starts once the winner's queue has played out.
      if (++this.endTimer >= END_DELAY_TICKS) {
        this.session.winner = this.result;
        this.session.go("results");
      }
    }
  }

  private checkRoundEnd(a: Fighter, b: Fighter): void {
    if (a.health <= 0 || b.health <= 0) {
      this.result = a.health <= 0 && b.health <= 0 ? null : a.health <= 0 ? 1 : 0;
      this.banner = this.result === null ? "DOUBLE K.O.!" : "K.O.!";
    } else if (this.timeLeft === 0) {
      this.result = a.health === b.health ? null : a.health > b.health ? 0 : 1;
      this.banner = this.result === null ? "DRAW!" : "TIME!";
    } else {
      return;
    }
    this.ended = true;
    this.moveInputs.forEach((m) => m.reset());
    // Only the winner keeps their pre-inputs, so a result can't be flipped afterwards.
    this.fighters?.forEach((f, i) => {
      if (i !== this.result) f.clearActions();
    });
  }

  private finishersDone(): boolean {
    return !this.fighters?.some((f, i) => i === this.result && (f.current !== null || f.queue.length > 0));
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
    const seconds = Math.ceil(this.timeLeft / TICKS_PER_SECOND);
    r.text(String(seconds), r.width / 2, 62, { size: 44, color: seconds <= 10 ? "#ff7766" : "#fff" });
    if (this.ended) r.text(this.banner, r.width / 2, r.height / 2 - 60, { size: 80, color: "#ffd84a" });
    r.text("Esc: quit to menu", r.width / 2, r.height - 12, { size: 14, color: "#778" });
  }
}
