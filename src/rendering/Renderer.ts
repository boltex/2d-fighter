import type { Fighter } from "../game/Fighter";
import { GROUND_Y } from "../game/Physics";

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas not supported");
    this.ctx = ctx;
  }

  render(fighters: Fighter[], labels: string[] = []): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#334";
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    fighters.forEach((f, i) => {
      ctx.fillStyle = f.color;
      ctx.fillRect(f.x - f.width / 2, f.y - f.height, f.width, f.height);
      ctx.fillStyle = "#fff";
      ctx.fillText(labels[i] ?? "", f.x, f.y - f.height - 10);
    });
  }
}
