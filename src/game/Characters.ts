export interface Character {
  id: string;
  name: string;
  color: string;
}

export const CHARACTERS: Character[] = [
  { id: "ember", name: "Ember", color: "#e74c3c" },
  { id: "tide", name: "Tide", color: "#3498db" },
  { id: "moss", name: "Moss", color: "#2ecc71" },
  { id: "volt", name: "Volt", color: "#f1c40f" },
];
