import { CharacterSelect } from "../ui/CharacterSelect";
import { InputSelect } from "../ui/InputSelect";
import { MainMenu } from "../ui/MainMenu";
import { Results } from "../ui/Results";
import { Renderer } from "../rendering/Renderer";
import { CHARACTERS } from "./Characters";
import { FightScene } from "./FightScene";
import type { Scene, SceneName, Session } from "./Scene";
import { loadSettings } from "./Settings";

const MAX_DT = 1 / 30;

// Owns the game loop and the current scene (a simple state machine).
export class Game {
  private renderer: Renderer;
  private session: Session;
  private factories: Record<SceneName, () => Scene>;
  private current: Scene | null = null;
  private pending: SceneName | null = "main-menu";
  private last = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.session = {
      settings: loadSettings(),
      characters: [CHARACTERS[0]!, CHARACTERS[1]!],
      winner: null,
      go: (name) => {
        this.pending = name;
      },
    };
    const s = this.session;
    this.factories = {
      "main-menu": () => new MainMenu(s),
      "input-select": () => new InputSelect(s),
      "character-select": () => new CharacterSelect(s),
      fight: () => new FightScene(s),
      results: () => new Results(s),
    };
  }

  start(): void {
    requestAnimationFrame((t) => {
      this.last = t;
      this.loop(t);
    });
  }

  private loop = (now: number): void => {
    const dt = Math.min((now - this.last) / 1000, MAX_DT);
    this.last = now;

    // Scene changes are applied between frames so a scene never swaps mid-update.
    if (this.pending) {
      this.current?.exit();
      this.current = this.factories[this.pending]();
      this.pending = null;
      this.current.enter();
    }
    this.current?.update(dt);
    this.current?.render(this.renderer);
    requestAnimationFrame(this.loop);
  };
}
