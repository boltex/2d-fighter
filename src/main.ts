import "./style.css";
import { Game } from "./game/Game";
import type { DeviceAssignment } from "./game/Input";

// Device choice per player via URL, e.g. ?p1=pad0&p2=arrows
// Values: wasd | arrows | pad0 | pad1 | pad2 | pad3
function parseDevice(value: string | null, fallback: DeviceAssignment): DeviceAssignment {
  if (value === "wasd" || value === "arrows") return { type: "keyboard", scheme: value };
  const pad = value?.match(/^pad(\d)$/);
  if (pad) return { type: "gamepad", index: Number(pad[1]) };
  return fallback;
}

const params = new URLSearchParams(location.search);
const assignments: DeviceAssignment[] = [
  parseDevice(params.get("p1"), { type: "keyboard", scheme: "wasd" }),
  parseDevice(params.get("p2"), { type: "keyboard", scheme: "arrows" }),
];

const canvas = document.getElementById("game") as HTMLCanvasElement;
new Game(canvas, assignments).start();
