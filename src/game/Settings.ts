import type { DeviceAssignment } from "./Input";

export interface Settings {
  devices: [DeviceAssignment, DeviceAssignment];
}

export const DEVICE_OPTIONS: DeviceAssignment[] = [
  { type: "keyboard", scheme: "wasd" },
  { type: "keyboard", scheme: "arrows" },
  { type: "gamepad", index: 0 },
  { type: "gamepad", index: 1 },
  { type: "gamepad", index: 2 },
  { type: "gamepad", index: 3 },
];

const STORAGE_KEY = "2d-fighter.settings";

export function sameDevice(a: DeviceAssignment, b: DeviceAssignment): boolean {
  if (a.type === "keyboard" && b.type === "keyboard") return a.scheme === b.scheme;
  if (a.type === "gamepad" && b.type === "gamepad") return a.index === b.index;
  return false;
}

export function deviceLabel(d: DeviceAssignment): string {
  if (d.type === "keyboard") return d.scheme === "wasd" ? "Keyboard (WASD)" : "Keyboard (Arrow keys)";
  const pad = navigator.getGamepads()[d.index];
  const status = pad ? pad.id.slice(0, 32) : "not detected - press a button";
  return `Gamepad ${d.index + 1} (${status})`;
}

function defaults(): Settings {
  return { devices: [{ type: "keyboard", scheme: "wasd" }, { type: "keyboard", scheme: "arrows" }] };
}

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { devices?: DeviceAssignment[] } | null;
    const saved = raw?.devices?.map((d) => DEVICE_OPTIONS.find((o) => sameDevice(o, d)));
    const [p1, p2] = saved ?? [];
    if (p1 && p2) return { devices: [p1, p2] };
  } catch {
    // fall through to defaults on corrupt storage
  }
  return defaults();
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
