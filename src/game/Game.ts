import { Renderer } from "../rendering/Renderer";
import { Fighter } from "./Fighter";
import { Input } from "./Input";

const MAX_DT = 1 / 30;

export class Game {
  private input = new Input();
  private renderer: Renderer;
  private fighters: Fighter[] = [
    new Fighter(240, "#e74c3c", { left: "KeyA", right: "KeyD", jump: "KeyW" }),
    new Fighter(720, "#3498db", { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" }),
  ];
  private last = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
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
    for (const f of this.fighters) f.update(dt, this.input);
    this.renderer.render(this.fighters);
    requestAnimationFrame(this.loop);
  };
}
