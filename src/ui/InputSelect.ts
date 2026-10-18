import { DEVICE_OPTIONS, deviceLabel, sameDevice, saveSettings } from "../game/Settings";
import { MenuNav } from "../game/MenuNav";
import type { Scene, Session } from "../game/Scene";
import type { Renderer } from "../rendering/Renderer";

const BACK_ROW = 2;

export class InputSelect implements Scene {
  private nav?: MenuNav;
  private row = 0;

  constructor(private session: Session) {}

  enter(): void {
    this.row = 0;
    this.nav = new MenuNav((key) => {
      if (key === "up") this.row = (this.row + BACK_ROW) % (BACK_ROW + 1);
      else if (key === "down") this.row = (this.row + 1) % (BACK_ROW + 1);
      else if (key === "left") this.cycle(-1);
      else if (key === "right") this.cycle(1);
      else if (key === "back" || (key === "confirm" && this.row === BACK_ROW)) this.leave();
    });
  }

  exit(): void {
    this.nav?.dispose();
  }

  private cycle(step: number): void {
    if (this.row >= BACK_ROW) return;
    const devices = this.session.settings.devices;
    const current = devices[this.row];
    if (!current) return;
    const idx = DEVICE_OPTIONS.findIndex((o) => sameDevice(o, current));
    const next = DEVICE_OPTIONS[(idx + step + DEVICE_OPTIONS.length) % DEVICE_OPTIONS.length];
    if (next) devices[this.row] = next;
  }

  private leave(): void {
    saveSettings(this.session.settings);
    this.session.go("main-menu");
  }

  update(): void {
    this.nav?.poll();
  }

  render(r: Renderer): void {
    const [d1, d2] = this.session.settings.devices;
    r.clear();
    r.text("CHOOSE INPUTS", r.width / 2, 100, { size: 48, color: "#ffd84a" });

    const rows = [
      { label: "Player 1", value: deviceLabel(d1), color: "#e74c3c" },
      { label: "Player 2", value: deviceLabel(d2), color: "#3498db" },
    ];
    rows.forEach((row, i) => {
      const y = 210 + i * 90;
      const on = this.row === i;
      r.text(row.label, r.width / 2, y, { size: 26, color: row.color });
      r.text(on ? `<  ${row.value}  >` : row.value, r.width / 2, y + 36, { size: 22, color: on ? "#ffd84a" : "#aab" });
    });
    r.list(["Back"], this.row === BACK_ROW ? 0 : -1, 420);

    if (sameDevice(d1, d2)) {
      r.text("Both players use the same device!", r.width / 2, 490, { size: 20, color: "#ff7766" });
    }
    r.text("Up/Down: row   Left/Right: change device   Esc: back", r.width / 2, r.height - 12, {
      size: 14,
      color: "#778",
    });
  }
}
