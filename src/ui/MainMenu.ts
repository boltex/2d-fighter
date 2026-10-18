import { MenuNav } from "../game/MenuNav";
import type { Scene, Session } from "../game/Scene";
import type { Renderer } from "../rendering/Renderer";

export class MainMenu implements Scene {
  private nav?: MenuNav;
  private selected = 0;
  private items = ["Play", "Options (choose inputs)"];

  constructor(private session: Session) {}

  enter(): void {
    this.selected = 0;
    this.nav = new MenuNav((key) => {
      const n = this.items.length;
      if (key === "up") this.selected = (this.selected + n - 1) % n;
      else if (key === "down") this.selected = (this.selected + 1) % n;
      else if (key === "confirm") this.session.go(this.selected === 0 ? "character-select" : "input-select");
    });
  }

  exit(): void {
    this.nav?.dispose();
  }

  update(): void {
    this.nav?.poll();
  }

  render(r: Renderer): void {
    r.clear();
    r.text("2D FIGHTER", r.width / 2, 150, { size: 72, color: "#ffd84a" });
    r.list(this.items, this.selected, 280);
    r.text("Up/Down: move   Enter / pad A: select", r.width / 2, r.height - 30, { size: 16, color: "#778" });
  }
}
