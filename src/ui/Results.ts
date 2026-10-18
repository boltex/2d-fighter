import { MenuNav } from "../game/MenuNav";
import type { Scene, Session } from "../game/Scene";
import type { Renderer } from "../rendering/Renderer";

export class Results implements Scene {
  private nav?: MenuNav;
  private selected = 0;
  private items = ["Rematch (choose character)", "Main Menu"];

  constructor(private session: Session) {}

  enter(): void {
    this.selected = 0;
    this.nav = new MenuNav((key) => {
      const n = this.items.length;
      if (key === "up") this.selected = (this.selected + n - 1) % n;
      else if (key === "down") this.selected = (this.selected + 1) % n;
      else if (key === "confirm") this.session.go(this.selected === 0 ? "character-select" : "main-menu");
    });
  }

  exit(): void {
    this.nav?.dispose();
  }

  update(): void {
    this.nav?.poll();
  }

  render(r: Renderer): void {
    const w = this.session.winner;
    const winner = w === null ? null : this.session.characters[w];
    r.clear();
    r.text("GAME OVER", r.width / 2, 120, { size: 64, color: "#ffd84a" });
    if (winner && w !== null) {
      r.text(`Player ${w + 1} (${winner.name}) wins!`, r.width / 2, 200, { size: 34, color: winner.color });
    } else {
      r.text("It's a draw!", r.width / 2, 200, { size: 34 });
    }
    r.list(this.items, this.selected, 320);
  }
}
