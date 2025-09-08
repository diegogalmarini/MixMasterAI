import { GoogleGenAI, Type } from "@google/genai";
import type { Cocktail, Difficulty } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cocktailSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      cocktailName: { type: Type.STRING, description: "The name of the cocktail." },
      description: { type: Type.STRING, description: "A short, enticing description of the drink." },
      prepTime: { type: Type.STRING, description: "Estimated preparation time, e.g., '5 minutes'." },
      difficulty: { type: Type.STRING, description: "Difficulty, must be one of: 'Very Easy', 'Easy', 'Medium', 'Hard', 'Expert'." },
      glassware: { type: Type.STRING, description: "The recommended type of glass, e.g., 'Martini glass'." },
      garnish: { type: Type.STRING, description: "The suggested garnish, e.g., 'Orange peel twist'." },
      flavorProfile: { type: Type.STRING, description: "The primary flavor profile, e.g., 'Sweet & Sour', 'Smoky & Strong'." },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            quantity: { type: Type.STRING, description: "The amount/measurement, e.g., '2 oz', '1/2 lime'." },
            name: { type: Type.STRING, description: "The name of the ingredient, e.g., 'Gin', 'Simple Syrup'." },
            isGarnish: { type: Type.BOOLEAN, description: "Set to true if this is primarily a garnish ingredient." }
          },
          required: ['quantity', 'name']
        }
      },
      instructions: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ['cocktailName', 'description', 'prepTime', 'difficulty', 'glassware', 'garnish', 'flavorProfile', 'ingredients', 'instructions']
  }
};

export const generateCocktails = async (ingredients: string[], language: 'en' | 'es'): Promise<Omit<Cocktail, 'id'>[]> => {
    if (!ingredients || ingredients.length === 0) {
        throw new Error("Please provide at least one ingredient.");
    }
    
    const model = "gemini-2.5-flash";
    const languageInstruction = language === 'es' ? 'Spanish' : 'English';

    const prompt = `You are an expert mixologist. Your task is to generate 3 unique cocktail recipes based on these ingredients: ${ingredients.join(', ')}. Respond entirely in ${languageInstruction}.
- The first two recipes must STRICTLY use ONLY the provided ingredients.
- The third recipe can be more creative and add 1-2 common bar staples (like simple syrup, bitters, or a common garnish). For any added staple ingredient, set its 'isGarnish' property if it's a garnish.
- Be creative and ensure the cocktail names and descriptions are appealing.
- Provide all the information required by the JSON schema.`;

    const maxRetries = 5;
    let lastError: any = null;
    let delay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: cocktailSchema
                },
            });

            const jsonText = response.text.trim();
            if (!jsonText) {
                throw new Error("API returned an empty response. This may be due to safety filters.");
            }
            const cocktails = JSON.parse(jsonText);
            
            if (Array.isArray(cocktails) && cocktails.length > 0) {
                return cocktails as Omit<Cocktail, 'id'>[];
            } else {
                 throw new Error("API returned invalid or empty cocktail data.");
            }

        } catch (error) {
            lastError = error;
            console.error(`Error generating cocktails (Attempt ${attempt}/${maxRetries}):`, error);

            if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
                throw new Error("API_KEY_INVALID");
            }
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    }
    
    console.error("Failed to generate cocktails after all retries. Last error:", lastError);
    throw new Error("GENERATION_FAILED");
};


export const generateCocktailImage = async (cocktail: Omit<Cocktail, 'id' | 'imageUrl' | 'imageState'>): Promise<string> => {
    const { cocktailName, description, glassware, garnish } = cocktail;
    const prompt = `A professional, moody, photorealistic image of a single cocktail named "${cocktailName}". This is a mixed beverage, do not interpret the name literally (e.g., as a landscape or object). The cocktail is perfectly served in a ${glassware}. The garnish is ${garnish}. The setting is a chic, dark, high-end night bar with subtle neon lighting in the background (pinks and blues), creating a sophisticated and modern ambiance. The image must be a close-up, sharp focus on ONLY the cocktail in its glass. Absolutely no people, hands, or other distracting objects.`;

    const maxRetries = 4;
    let delay = 3000;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '16:9',
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            } else {
                throw new Error("No image was generated by the API.");
            }
        } catch (error: any) {
            lastError = error;
            const errorMessage = error?.error?.message || error?.message || '';
            const errorStatus = error?.error?.status || '';

            if (errorStatus === "RESOURCE_EXHAUSTED" || errorMessage.toLowerCase().includes("quota")) {
                throw new Error("QUOTA_EXCEEDED");
            }
             if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
                throw new Error("API_KEY_INVALID");
            }

            console.error(`Error generating image for "${cocktailName}" (Attempt ${attempt}/${maxRetries}):`, error);
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    }
    
    console.error(`Failed to generate image for "${cocktailName}" after all retries. Last error:`, lastError);
    throw new Error("IMAGE_GENERATION_FAILED");
};

export const identifyIngredientsFromImage = async (base64ImageData: string, mimeType: string, language: 'en' | 'es'): Promise<string[]> => {
    const model = "gemini-2.5-flash";
    const languageInstruction = language === 'es' ? 'Spanish' : 'English';

    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: base64ImageData,
        },
    };

    const textPart = {
        text: `Analyze this image and identify all usable cocktail ingredients present (spirits, mixers, fruits, herbs). List only the names of the ingredients. Respond entirely in ${languageInstruction}. The response must be a JSON array of strings.`
    };
    
    const ingredientsSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.STRING,
            description: "The name of an identified ingredient."
        }
    };

    const maxRetries = 4;
    let delay = 3000;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: ingredientsSchema,
                },
            });
            const jsonText = response.text.trim();
            if (!jsonText) {
                throw new Error("API returned an empty response. This may be due to safety filters.");
            }
            const result = JSON.parse(jsonText);
            return Array.isArray(result) ? result : [];

        } catch (error) {
            lastError = error;
            console.error(`Error identifying ingredients (Attempt ${attempt}/${maxRetries}):`, error);

            if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
                throw new Error("API_KEY_INVALID");
            }
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    }
    
    console.error("Failed to identify ingredients after all retries. Last error:", lastError);
    throw new Error("IDENTIFICATION_FAILED");
};

const translationSchema = {
    type: Type.OBJECT,
    properties: {
      cocktailName: { type: Type.STRING },
      description: { type: Type.STRING },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.STRING },
          },
          required: ['name', 'quantity']
        }
      },
      instructions: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      prepTime: { type: Type.STRING },
      difficulty: { type: Type.STRING },
      glassware: { type: Type.STRING },
      garnish: { type: Type.STRING },
      flavorProfile: { type: Type.STRING },
    },
    required: ['cocktailName', 'description', 'ingredients', 'instructions', 'prepTime', 'difficulty', 'glassware', 'garnish', 'flavorProfile']
};

export const translateCocktail = async (cocktail: Cocktail, targetLanguage: 'en' | 'es', sourceLanguage: 'en' | 'es'): Promise<Partial<Cocktail>> => {
    const targetLanguageName = targetLanguage === 'es' ? 'Spanish' : 'English';
    const sourceLanguageName = sourceLanguage === 'es' ? 'Spanish' : 'English';

    const translatablePart = {
        cocktailName: cocktail.cocktailName,
        description: cocktail.description,
        ingredients: cocktail.ingredients.map(i => ({ name: i.name, quantity: i.quantity })),
        instructions: cocktail.instructions,
        prepTime: cocktail.prepTime,
        difficulty: cocktail.difficulty,
        glassware: cocktail.glassware,
        garnish: cocktail.garnish,
        flavorProfile: cocktail.flavorProfile,
    };

    const prompt = `Translate the following cocktail content from ${sourceLanguageName} to ${targetLanguageName}.
- Translate all text values, including ingredient names, quantities (e.g., 'oz', 'cup' to 'taza'), instructions, and time units (e.g., 'minutes' to 'minutos').
- For the 'difficulty' field, translate the value to its ${targetLanguageName} equivalent. The possible English values are: 'Very Easy', 'Easy', 'Medium', 'Hard', 'Expert'. The Spanish equivalents are: 'Muy Fácil', 'Fácil', 'Medio', 'Difícil', 'Experto'.
- Respond ONLY with a JSON object matching the provided schema.

Content to translate:
${JSON.stringify(translatablePart, null, 2)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: translationSchema,
            },
        });

        const jsonText = response.text.trim();
        const translatedPart = JSON.parse(jsonText);
        
        const difficultyMap: { [key: string]: Difficulty } = {
            'Muy Fácil': 'Very Easy', 'Fácil': 'Easy', 'Medio': 'Medium', 'Difícil': 'Hard', 'Experto': 'Expert',
            'Very Easy': 'Very Easy', 'Easy': 'Easy', 'Medium': 'Medium', 'Hard': 'Hard', 'Expert': 'Expert'
        };
        const mappedDifficulty = difficultyMap[translatedPart.difficulty as string] || cocktail.difficulty;

        const translatedIngredients = cocktail.ingredients.map((originalIng, index) => ({
            ...originalIng,
            name: translatedPart.ingredients[index]?.name || originalIng.name,
            quantity: translatedPart.ingredients[index]?.quantity || originalIng.quantity,
        }));

        return {
            ...translatedPart,
            difficulty: mappedDifficulty,
            ingredients: translatedIngredients
        };

    } catch (error) {
        console.error(`Error translating cocktail "${cocktail.cocktailName}":`, error);
        return {}; // Return empty object on failure to avoid overwriting with bad data
    }
};

// --- SHARING FUNCTIONS ---
export const saveSharedCocktail = async (cocktail: Omit<Cocktail, 'id' | 'imageState' | 'imageUrl'>, imageUrl: string | undefined): Promise<string> => {
    const id = Math.random().toString(36).substring(2, 11);
    const dataToStore = {
        cocktailData: cocktail,
        imageUrl: imageUrl,
    };
    
    try {
        localStorage.setItem(`shared_cocktail_${id}`, JSON.stringify(dataToStore));
    } catch (e) {
        console.error("Failed to save shared cocktail to localStorage", e);
        throw new Error('Failed to save cocktail for sharing');
    }
    
    await new Promise(resolve => setTimeout(resolve, 250));
    return id;
};

export const getSharedCocktail = async (id: string): Promise<Cocktail> => {
    await new Promise(resolve => setTimeout(resolve, 250));

    try {
        const storedData = localStorage.getItem(`shared_cocktail_${id}`);
        if (!storedData) {
            throw new Error('Cocktail not found in localStorage');
        }
        
        const { cocktailData, imageUrl } = JSON.parse(storedData);
        
        return {
            ...cocktailData,
            id: id,
            imageUrl: imageUrl,
            imageState: imageUrl ? 'success' : 'error'
        };
    } catch (e) {
        console.error("Failed to retrieve shared cocktail from localStorage", e);
        throw new Error('Failed to retrieve shared cocktail');
    }
};