export interface Controls {
  left: string;
  right: string;
  jump: string;
}

export class Input {
  private down = new Set<string>();

  constructor() {
    window.addEventListener("keydown", (e) => {
      this.down.add(e.code);
      if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    window.addEventListener("blur", () => this.down.clear());
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }
}
