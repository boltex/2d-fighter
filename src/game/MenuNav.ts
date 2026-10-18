export type MenuKey = "up" | "down" | "left" | "right" | "confirm" | "back";

const KEYS: Record<string, MenuKey> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Enter: "confirm",
  Space: "confirm",
  Escape: "back",
  Backspace: "back",
};

const STICK = 0.5;

// Menu navigation from the keyboard and (optionally) every connected gamepad.
export class MenuNav {
  private active = new Set<MenuKey>();

  constructor(
    private onKey: (key: MenuKey) => void,
    private useGamepad = true,
  ) {
    window.addEventListener("keydown", this.onDown);
    // Prime state so a button still held from the previous screen doesn't fire.
    this.scan(false);
  }

  private onDown = (e: KeyboardEvent): void => {
    const key = KEYS[e.code];
    if (!key) return;
    e.preventDefault();
    if (!e.repeat) this.onKey(key);
  };

  poll(): void {
    this.scan(true);
  }

  private scan(emit: boolean): void {
    if (!this.useGamepad) return;
    const now = new Set<MenuKey>();
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue;
      const b = (i: number) => pad.buttons[i]?.pressed ?? false;
      const x = pad.axes[0] ?? 0;
      const y = pad.axes[1] ?? 0;
      if (b(12) || y < -STICK) now.add("up");
      if (b(13) || y > STICK) now.add("down");
      if (b(14) || x < -STICK) now.add("left");
      if (b(15) || x > STICK) now.add("right");
      if (b(0) || b(9)) now.add("confirm");
      if (b(1)) now.add("back");
    }
    if (emit) for (const k of now) if (!this.active.has(k)) this.onKey(k);
    this.active = now;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onDown);
  }
}
