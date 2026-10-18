import type { Fighter } from "../game/Fighter";
import { MAX_HEALTH } from "../game/Fighter";
import { GROUND_Y } from "../game/Physics";

export interface TextStyle {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas not supported");
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear(color = "#223"): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  text(str: string, x: number, y: number, { size = 24, color = "#fff", align = "center" }: TextStyle = {}): void {
    const { ctx } = this;
    ctx.font = `${size}px monospace`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  list(items: string[], selected: number, y0: number, gap = 56): void {
    items.forEach((item, i) => {
      const on = i === selected;
      this.text(on ? `> ${item} <` : item, this.width / 2, y0 + i * gap, {
        size: on ? 30 : 26,
        color: on ? "#ffd84a" : "#aab",
      });
    });
  }

  stage(): void {
    this.clear("#223");
    this.ctx.fillStyle = "#334";
    this.ctx.fillRect(0, GROUND_Y, this.width, this.height - GROUND_Y);
  }

  fighter(f: Fighter, label: string, queueLabel: string): void {
    const { ctx } = this;
    const body = f.state === "hitstun" ? "#ffe9a0" : f.color;
    ctx.globalAlpha = f.state === "knockdown" ? 0.6 : 1;
    ctx.fillStyle = body;
    for (const b of f.hurtboxes()) ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (const b of f.hitboxes()) ctx.fillRect(b.x, b.y, b.w, b.h);

    this.text(label, f.x, f.y - 135, { size: 20 });
    this.text(queueLabel, f.x, f.y + 24, { size: 16, color: "#aab" });
  }

  healthBar(f: Fighter, side: "left" | "right"): void {
    const { ctx } = this;
    const w = 380;
    const h = 24;
    const x = side === "left" ? 40 : this.width - 40 - w;
    const fill = (w * f.health) / MAX_HEALTH;
    ctx.fillStyle = "#000";
    ctx.fillRect(x, 30, w, h);
    ctx.fillStyle = f.color;
    ctx.fillRect(side === "left" ? x : x + w - fill, 30, fill, h);
    this.text(f.name, side === "left" ? x : x + w, 80, { size: 20, align: side === "left" ? "left" : "right" });
  }
}
