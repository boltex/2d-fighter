export interface Character {
  id: string;
  name: string;
  color: string;
  moveset: string;
}

export const CHARACTERS: Character[] = [
  { id: "ember", name: "Ember", color: "#e74c3c", moveset: "default" },
  { id: "tide", name: "Tide", color: "#3498db", moveset: "default" },
  { id: "moss", name: "Moss", color: "#2ecc71", moveset: "default" },
  { id: "volt", name: "Volt", color: "#f1c40f", moveset: "default" },
];
