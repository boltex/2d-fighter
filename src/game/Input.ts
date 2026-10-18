export type Action = "up" | "down" | "towards" | "away";

export interface PlayerInput {
  player: number;
  action: Action;
  pressed: boolean;
}

// Physical directions as reported by a device, before facing is applied.
export type Direction = "up" | "down" | "left" | "right";
export type Facing = 1 | -1;

export type DeviceAssignment =
  | { type: "keyboard"; scheme: "wasd" | "arrows" }
  | { type: "gamepad"; index: number };

export type DirectionEmitter = (direction: Direction, pressed: boolean) => void;

export interface InputDevice {
  poll?(): void;
  dispose(): void;
}

const KEY_SCHEMES: Record<"wasd" | "arrows", Record<string, Direction>> = {
  wasd: { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" },
  arrows: { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" },
};

class KeyboardDevice implements InputDevice {
  private keys: Record<string, Direction>;

  constructor(
    scheme: "wasd" | "arrows",
    private emit: DirectionEmitter,
  ) {
    this.keys = KEY_SCHEMES[scheme];
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
  }

  private onDown = (e: KeyboardEvent): void => {
    const dir = this.keys[e.code];
    if (!dir) return;
    e.preventDefault();
    if (!e.repeat) this.emit(dir, true);
  };

  private onUp = (e: KeyboardEvent): void => {
    const dir = this.keys[e.code];
    if (dir) this.emit(dir, false);
  };

  dispose(): void {
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
  }
}

const STICK_THRESHOLD = 0.5;
const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

// Uses the "standard" gamepad mapping: d-pad is buttons 12-15, left stick is axes 0/1.
class GamepadDevice implements InputDevice {
  private state: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };

  constructor(
    private index: number,
    private emit: DirectionEmitter,
  ) {}

  poll(): void {
    const pad = navigator.getGamepads()[this.index] ?? null;
    const pressed = (i: number) => pad?.buttons[i]?.pressed ?? false;
    const x = pad?.axes[0] ?? 0;
    const y = pad?.axes[1] ?? 0;
    const next: Record<Direction, boolean> = {
      up: pressed(12) || y < -STICK_THRESHOLD,
      down: pressed(13) || y > STICK_THRESHOLD,
      left: pressed(14) || x < -STICK_THRESHOLD,
      right: pressed(15) || x > STICK_THRESHOLD,
    };
    for (const dir of DIRECTIONS) {
      if (next[dir] !== this.state[dir]) {
        this.state[dir] = next[dir];
        this.emit(dir, next[dir]);
      }
    }
  }

  dispose(): void {
    // Release anything still held so nothing sticks after reassignment.
    for (const dir of DIRECTIONS) {
      if (this.state[dir]) this.emit(dir, false);
    }
  }
}

type Listener = (input: PlayerInput) => void;

export class InputManager {
  private devices: (InputDevice | undefined)[] = [];
  private listeners: Listener[] = [];
  // Remembers which action each held direction produced, so releases match presses
  // even if the fighter turns around in between.
  private held: Map<Direction, Action>[] = [];

  constructor(
    assignments: DeviceAssignment[],
    private getFacing: (player: number) => Facing,
  ) {
    assignments.forEach((a, player) => this.assign(player, a));
  }

  onInput(listener: Listener): void {
    this.listeners.push(listener);
  }

  assign(player: number, assignment: DeviceAssignment): void {
    this.devices[player]?.dispose();
    this.held[player] = new Map();
    const emit: DirectionEmitter = (dir, pressed) => this.handle(player, dir, pressed);
    this.devices[player] =
      assignment.type === "keyboard"
        ? new KeyboardDevice(assignment.scheme, emit)
        : new GamepadDevice(assignment.index, emit);
  }

  poll(): void {
    for (const d of this.devices) d?.poll?.();
  }

  private handle(player: number, dir: Direction, pressed: boolean): void {
    const held = this.held[player];
    if (!held) return;
    let action: Action | undefined;
    if (pressed) {
      action = this.toAction(player, dir);
      held.set(dir, action);
    } else {
      action = held.get(dir);
      held.delete(dir);
    }
    if (!action) return;
    for (const l of this.listeners) l({ player, action, pressed });
  }

  private toAction(player: number, dir: Direction): Action {
    if (dir === "up" || dir === "down") return dir;
    const towardsIsRight = this.getFacing(player) === 1;
    return (dir === "right") === towardsIsRight ? "towards" : "away";
  }
}
