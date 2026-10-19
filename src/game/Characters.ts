export interface Character {
  id: string;
  name: string;
  color: string;
  moveset: string;
  mass: number;
  canHover: boolean; // Has jetpack, or other means of hovering
}

export const CHARACTERS: Character[] = [
  { id: "ember", name: "Ember", color: "#e74c3c", moveset: "default", mass: 1, canHover: false },
  { id: "tide", name: "Tide", color: "#3498db", moveset: "default", mass: 2.5, canHover: false },
  { id: "moss", name: "Moss", color: "#2ecc71", moveset: "default", mass: 0.75, canHover: false },
  { id: "volt", name: "Volt", color: "#f1c40f", moveset: "default", mass: 1.25, canHover: false },
];
