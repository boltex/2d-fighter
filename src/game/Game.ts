import { Renderer } from "../rendering/Renderer";
import { Fighter } from "./Fighter";
import { InputManager, type DeviceAssignment } from "./Input";
import { MoveInput } from "./MoveInput";

const MAX_DT = 1 / 30;

export class Game {
  private renderer: Renderer;
  private input: InputManager;
  private fighters: Fighter[] = [new Fighter(240, "#e74c3c"), new Fighter(720, "#3498db")];
  private moveInputs: MoveInput[];
  private last = 0;

  constructor(canvas: HTMLCanvasElement, assignments: DeviceAssignment[]) {
    this.renderer = new Renderer(canvas);
    this.moveInputs = this.fighters.map((f) => new MoveInput((move) => f.perform(move)));
    this.input = new InputManager(assignments, (p) => this.fighters[p]?.facing ?? 1);
    this.input.onInput(({ player, action, pressed }) => {
      if (pressed) this.moveInputs[player]?.press(action);
    });
  }

  start(): void {
    requestAnimationFrame((t) => {
      this.last = t;
      this.loop(t);
    });
  }

  private loop = (now: number): void => {
    const dt = Math.min((now - this.last) / 1000, MAX_DT);
    this.last = now;

    this.input.poll();
    const [a, b] = this.fighters;
    if (a && b) {
      a.facing = b.x >= a.x ? 1 : -1;
      b.facing = a.x >= b.x ? 1 : -1;
    }
    for (const f of this.fighters) f.update(dt);

    const labels = this.fighters.map((f, i) => {
      const pending = this.moveInputs[i]?.pending();
      return pending ? `${pending} …` : (f.lastMove ?? "");
    });
    this.renderer.render(this.fighters, labels);
    requestAnimationFrame(this.loop);
  };
}
