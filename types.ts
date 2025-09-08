export type Difficulty = 'Very Easy' | 'Easy' | 'Medium' | 'Hard' | 'Expert';
export type ImageState = 'loading' | 'success' | 'error' | 'error_quota';

export interface Cocktail {
  id: string;
  cocktailName: string; // Renamed from recipeName
  description: string;
  ingredients: {
    name: string;
    quantity: string;
    isGarnish?: boolean; // Changed from isStaple
  }[];
  instructions: string[];
  prepTime: string;
  difficulty: Difficulty;
  glassware: string; // NEW: e.g., "Martini glass", "Highball glass"
  garnish: string;   // NEW: e.g., "Lime wheel", "Olive"
  flavorProfile: string; // NEW: e.g., "Sweet & Sour", "Smoky & Strong"
  imageUrl?: string;
  imageState?: ImageState;
}
