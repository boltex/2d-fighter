import type { Renderer } from "../rendering/Renderer";
import { Fighter } from "./Fighter";
import { InputManager } from "./Input";
import { MenuNav } from "./MenuNav";
import { MoveInput, type Move } from "./MoveInput";
import type { Scene, Session } from "./Scene";

const KO_DELAY = 1.5;

interface Attack {
  damage: number;
  range: number; // reach beyond the attacker's body
  low: boolean; // whiffs against airborne targets
}

const ATTACKS: Partial<Record<Move, Attack>> = {
  "up-towards": { damage: 8, range: 50, low: false },
  "down-towards": { damage: 6, range: 55, low: true },
};

export class FightScene implements Scene {
  private fighters: Fighter[] = [];
  private moveInputs: MoveInput[] = [];
  private input?: InputManager;
  private nav?: MenuNav;
  private winner: number | null = null;
  private koTimer = 0;

  constructor(private session: Session) {}

  enter(): void {
    const [c1, c2] = this.session.characters;
    this.fighters = [new Fighter(240, c1.color, c1.name), new Fighter(720, c2.color, c2.name)];
    this.winner = null;
    this.koTimer = 0;

    this.moveInputs = this.fighters.map(
      (f, i) =>
        new MoveInput((move) => {
          if (this.winner !== null) return;
          const other = this.fighters[1 - i];
          if (f.perform(move) && other) this.resolveAttack(f, other, move);
        }),
    );
    this.input = new InputManager(this.session.settings.devices, (p) => this.fighters[p]?.facing ?? 1);
    this.input.onInput(({ player, action, pressed }) => {
      if (pressed) this.moveInputs[player]?.press(action);
    });
    // Keyboard only, so a stray gamepad button can't abandon a match.
    this.nav = new MenuNav((k) => k === "back" && this.session.go("main-menu"), false);
  }

  exit(): void {
    this.input?.dispose();
    this.nav?.dispose();
  }

  private resolveAttack(attacker: Fighter, defender: Fighter, move: Move): void {
    const atk = ATTACKS[move];
    if (!atk) return;
    const gap = (defender.x - attacker.x) * attacker.facing - (attacker.width + defender.width) / 2;
    if (gap < -attacker.width || gap > atk.range) return;
    if (atk.low && !defender.grounded) return;
    defender.health = Math.max(0, defender.health - atk.damage);
  }

  update(dt: number): void {
    this.input?.poll();
    const [a, b] = this.fighters;
    if (!a || !b) return;
    a.facing = b.x >= a.x ? 1 : -1;
    b.facing = a.x >= b.x ? 1 : -1;
    for (const f of this.fighters) f.update(dt);

    if (this.winner === null) {
      const dead = this.fighters.findIndex((f) => f.health <= 0);
      if (dead >= 0) this.winner = 1 - dead;
    } else {
      this.koTimer += dt;
      if (this.koTimer >= KO_DELAY) {
        this.session.winner = this.winner;
        this.session.go("results");
      }
    }
  }

  render(r: Renderer): void {
    r.stage();
    this.fighters.forEach((f, i) => {
      const pending = this.moveInputs[i]?.pending();
      r.fighter(f, pending ? `${pending} ...` : (f.lastMove ?? ""));
      r.healthBar(f, i === 0 ? "left" : "right");
    });
    if (this.winner !== null) r.text("K.O.!", r.width / 2, r.height / 2 - 60, { size: 80, color: "#ffd84a" });
    r.text("Esc: quit to menu", r.width / 2, r.height - 12, { size: 14, color: "#778" });
  }
}
