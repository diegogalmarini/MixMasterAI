
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Cocktail, ImageState } from './types';
import { generateCocktails, generateCocktailImage, identifyIngredientsFromImage, translateCocktail, saveSharedCocktail, getSharedCocktail } from './services/geminiService';
import IngredientInput from './components/IngredientInput';
import CocktailCard from './components/RecipeCard';
import Spinner from './components/Spinner';
import ConfirmationModal from './components/ConfirmationModal';
import MixMasterLogo from './components/NutriChefLogo';

const locales = {
    en: {
        title: "MixMasterAI",
        subtitle: "Craft the perfect cocktail with the ingredients you have.",
        yourIngredients: "Your Bar Ingredients",
        generate: "Generate Cocktails",
        generating: "Mixing...",
        addPlaceholder: "e.g., Vodka, Lime Juice, Ginger Beer",
        add: "Add",
        errorTitle: "Oops!",
        errorContent: "An unknown error occurred.",
        errorEmptyIngredients: "Please add at least one ingredient to generate a cocktail.",
        errorQuotaExceeded: "Image generation quota exceeded. Please check your plan and billing details.",
        errorGeneration: "Failed to generate cocktails. The mixologist might be on a break. Please check your ingredients and try again.",
        errorImageGeneration: "Failed to create an image for the cocktail. Please try again.",
        errorApiKey: "The application is not configured correctly. Please contact the administrator.",
        errorIdentification: "Failed to identify ingredients from the image. Please try another photo.",
        errorOffline: "You appear to be offline. Please check your internet connection.",
        errorSharedCocktailNotFound: "The shared cocktail could not be found or has expired.",
        loadingCocktails: "Crafting cocktails...",
        loadingImages: "Garnishing your drink...",
        myFavoriteCocktails: "My Favorite Cocktails",
        scanning: "Scanning...",
        linkCopied: "Link copied to clipboard!",
        sharedCocktailTitle: "A Cocktail Shared With You",
        backToGenerator: "Back to Cocktail Generator",
        retry: "Retry",
    },
    es: {
        title: "MixMasterAI",
        subtitle: "Crea el cóctel perfecto con los ingredientes que tienes.",
        yourIngredients: "Ingredientes de tu Bar",
        generate: "Generar Cócteles",
        generating: "Mezclando...",
        addPlaceholder: "Ej: Vodka, Jugo de Lima, Ginger Beer",
        add: "Añadir",
        errorTitle: "¡Ups!",
        errorContent: "Ocurrió un error desconocido.",
        errorEmptyIngredients: "Por favor, añade al menos un ingrediente para generar un cóctel.",
        errorQuotaExceeded: "Se ha excedido la cuota de generación de imágenes. Revisa tu plan y detalles de facturación.",
        errorGeneration: "No se pudieron generar los cócteles. El mixólogo podría estar en un descanso. Revisa tus ingredientes e inténtalo de nuevo.",
        errorImageGeneration: "No se pudo crear una imagen para el cóctel. Por favor, inténtalo de nuevo.",
        errorApiKey: "La aplicación no está configurada correctamente. Por favor, contacta al administrador.",
        errorIdentification: "No se pudieron identificar los ingredientes de la imagen. Por favor, intenta con otra foto.",
        errorOffline: "Parece que no tienes conexión. Por favor, revisa tu conexión a internet.",
        errorSharedCocktailNotFound: "El cóctel compartido no se pudo encontrar o ha expirado.",
        loadingCocktails: "Creando cócteles...",
        loadingImages: "Adornando tu bebida...",
        myFavoriteCocktails: "Mis Cócteles Favoritos",
        scanning: "Escaneando...",
        linkCopied: "¡Enlace copiado al portapapeles!",
        sharedCocktailTitle: "Un Cóctel Compartido Contigo",
        backToGenerator: "Volver al Generador",
        retry: "Reintentar",
    }
};

const allIngredients = {
    en: {
        spirits: ['Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Brandy'],
        mixers: ['Lime Juice', 'Lemon Juice', 'Tonic Water', 'Soda Water', 'Orange Juice', 'Simple Syrup'],
        modifiers: ['Triple Sec', 'Vermouth', 'Bitters', 'Mint Leaves', 'Agave Nectar']
    },
    es: {
        spirits: ['Vodka', 'Ginebra', 'Ron', 'Tequila', 'Whisky', 'Brandy'],
        mixers: ['Jugo de Lima', 'Jugo de Limón', 'Agua Tónica', 'Agua con Gas', 'Jugo de Naranja', 'Jarabe Simple'],
        modifiers: ['Triple Seco', 'Vermut', 'Amargo de Angostura', 'Hojas de Menta', 'Néctar de Agave']
    }
};

const allEnIngredients = [
    ...allIngredients.en.spirits,
    ...allIngredients.en.mixers,
    ...allIngredients.en.modifiers,
];
const allEsIngredients = [
    ...allIngredients.es.spirits,
    ...allIngredients.es.mixers,
    ...allIngredients.es.modifiers,
];

const getRandomIngredients = (): string[] => {
    const { spirits, mixers, modifiers } = allIngredients.es; // Default to Spanish
    const randomSpirit = spirits[Math.floor(Math.random() * spirits.length)];
    const randomMixer = mixers[Math.floor(Math.random() * mixers.length)];
    const randomModifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    return [randomSpirit, randomMixer, randomModifier];
};

const App: React.FC = () => {
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [cocktails, setCocktails] = useState<Cocktail[]>([]);
    const [favoriteCocktails, setFavoriteCocktails] = useState<Cocktail[]>(() => {
        try {
            const savedFavorites = localStorage.getItem('mixMasterFavorites');
            const parsed = savedFavorites ? JSON.parse(savedFavorites) : [];
            return parsed.map((r: Cocktail) => ({ ...r, imageState: r.imageUrl ? 'success' : 'error' }));
        } catch (error) {
            console.error("Could not load favorites from localStorage", error);
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState<'en' | 'es'>('es');
    const [sharedCocktail, setSharedCocktail] = useState<Cocktail | null>(null);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [showCopyToast, setShowCopyToast] = useState<boolean>(false);
    
    const prevLangRef = useRef(language);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const t = locales[language];
    
    useEffect(() => {
        try {
            localStorage.setItem('mixMasterFavorites', JSON.stringify(favoriteCocktails));
        } catch (error) {
            console.error("Could not save favorites to localStorage", error);
        }
    }, [favoriteCocktails]);

    useEffect(() => {
        const hash = window.location.hash;
        const match = hash.match(/^#\/share\/([a-zA-Z0-9]+)$/);

        if (match) {
            const cocktailId = match[1];
            (async () => {
                try {
                    const cocktail = await getSharedCocktail(cocktailId);
                    setSharedCocktail(cocktail);
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (e) {
                    console.error("Failed to load shared cocktail:", e);
                    setError(t.errorSharedCocktailNotFound);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            })();
        } else {
            setIngredients(getRandomIngredients());
        }
    }, []);

    useEffect(() => {
        const prevLang = prevLangRef.current;
        if (prevLang === language) {
            return;
        }
    
        if (!sharedCocktail) {
            const translateIngredient = (ingredient: string): string => {
                const lowerCaseIngredient = ingredient.toLowerCase();
                let index = -1;
                if (prevLang === 'en' && language === 'es') {
                    index = allEnIngredients.findIndex(ing => ing.toLowerCase() === lowerCaseIngredient);
                    if (index !== -1) return allEsIngredients[index];
                } else if (prevLang === 'es' && language === 'en') {
                    index = allEsIngredients.findIndex(ing => ing.toLowerCase() === lowerCaseIngredient);
                    if (index !== -1) return allEnIngredients[index];
                }
                return ingredient;
            };
            setIngredients(currentIngredients => currentIngredients.map(translateIngredient));
        }
    
        const translateAllCocktails = async () => {
            const translateList = (list: Cocktail[]) => Promise.all(
                list.map(async (cocktail) => {
                    const translatedFields = await translateCocktail(cocktail, language, prevLang);
                    return { ...cocktail, ...translatedFields };
                })
            );
    
            if (cocktails.length > 0) {
                translateList(cocktails).then(setCocktails);
            }
            if (favoriteCocktails.length > 0) {
                translateList(favoriteCocktails).then(setFavoriteCocktails);
            }
            if (sharedCocktail) {
                translateList([sharedCocktail]).then(translated => setSharedCocktail(translated[0]));
            }
        };
    
        translateAllCocktails();
        prevLangRef.current = language;
    }, [language]);


    const handleAddIngredient = (ingredient: string) => {
        if (ingredient && !ingredients.map(i => i.toLowerCase()).includes(ingredient.toLowerCase())) {
            setIngredients([...ingredients, ingredient]);
        }
    };
    
    const handleAddMultipleIngredients = (newIngredients: string[]) => {
        const uniqueNewIngredients = newIngredients.filter(newIng => 
            !ingredients.map(i => i.toLowerCase()).includes(newIng.toLowerCase())
        );
        setIngredients(prev => [...prev, ...uniqueNewIngredients]);
    };

    const handleRemoveIngredient = (ingredientToRemove: string) => {
        setIngredients(ingredients.filter(ingredient => ingredient !== ingredientToRemove));
    };

    const handleToggleFavorite = (cocktailToToggle: Cocktail) => {
        setFavoriteCocktails(prev => {
            const isFavorited = prev.some(r => r.id === cocktailToToggle.id);
            if (isFavorited) {
                return prev.filter(r => r.id !== cocktailToToggle.id);
            } else {
                 const cocktailToAdd = { ...cocktailToToggle };
                if (!cocktailToAdd.imageState) {
                    cocktailToAdd.imageState = cocktailToAdd.imageUrl ? 'success' : 'error';
                }
                return [...prev, cocktailToAdd];
            }
        });
    };

    const handleGenerateCocktails = useCallback(async () => {
        if (!navigator.onLine) {
            setError(t.errorOffline);
            return;
        }
        if (ingredients.length === 0) {
            setError(t.errorEmptyIngredients);
            return;
        }
        setIsLoading(true);
        setLoadingMessage(t.loadingCocktails);
        setError(null);
        setCocktails([]);
        try {
            const generated = await generateCocktails(ingredients, language);
            const cocktailsWithIds = generated.map(r => ({ ...r, id: `cocktail-${Date.now()}-${Math.random()}`, imageState: 'loading' as ImageState }));
            setCocktails(cocktailsWithIds);
            setLoadingMessage(t.loadingImages);

            for (const cocktail of cocktailsWithIds) {
                try {
                    const imageUrl = await generateCocktailImage(cocktail);
                    setCocktails(currentCocktails =>
                        currentCocktails.map(r =>
                            r.id === cocktail.id ? { ...r, imageUrl, imageState: 'success' as const } : r
                        )
                    );
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause for 2 seconds
                } catch (imgErr) {
                    if (imgErr instanceof Error) {
                        if (imgErr.message === "QUOTA_EXCEEDED") {
                            setError(t.errorQuotaExceeded);
                            setCocktails(current => current.map(r =>
                                r.imageState === 'loading' ? { ...r, imageState: 'error_quota' as const } : r
                            ));
                            break; 
                        } 
                        if (imgErr.message === 'API_KEY_INVALID') {
                            setError(t.errorApiKey);
                            setCocktails(current => current.map(r => r.imageState === 'loading' ? { ...r, imageState: 'error' as const } : r));
                            break;
                        }
                        
                        console.error(`Failed to generate image for "${cocktail.cocktailName}":`, imgErr);
                        setError(t.errorImageGeneration);
                        setCocktails(currentCocktails =>
                            currentCocktails.map(r =>
                                r.id === cocktail.id ? { ...r, imageState: 'error' as const } : r
                            )
                        );
                    } else {
                        console.error(`An unknown error occurred while generating image for "${cocktail.cocktailName}":`, imgErr);
                        setError(t.errorContent);
                        setCocktails(current => current.map(r => r.imageState === 'loading' ? { ...r, imageState: 'error' as const } : r));
                        break;
                    }
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                switch(err.message) {
                    case 'API_KEY_INVALID':
                        setError(t.errorApiKey);
                        break;
                    case 'GENERATION_FAILED':
                        setError(t.errorGeneration);
                        break;
                    default:
                        setError(err.message);
                }
            } else {
                setError(t.errorContent);
            }
        } finally {
            setIsLoading(false);
        }
    }, [ingredients, language, t]);

    const handleScanRequest = () => {
        fileInputRef.current?.click();
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setError(null);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const base64String = (reader.result as string).split(',')[1];
                const identified = await identifyIngredientsFromImage(base64String, file.type, language);
                setDetectedIngredients(identified);
                setIsModalOpen(true);
            } catch (err) {
                 if (err instanceof Error) {
                    switch(err.message) {
                        case 'API_KEY_INVALID':
                            setError(t.errorApiKey);
                            break;
                        case 'IDENTIFICATION_FAILED':
                            setError(t.errorIdentification);
                            break;
                        default:
                             setError(err.message);
                    }
                 } else {
                    setError(t.errorContent);
                 }
            } finally {
                setIsScanning(false);
                if(fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.onerror = () => {
             setError(t.errorContent);
             setIsScanning(false);
        };
    };
    
    const handleShareCocktail = useCallback(async (cocktail: Cocktail) => {
        try {
            const { id, imageState, ...cocktailToShare } = cocktail;
            const sharedId = await saveSharedCocktail(cocktailToShare, cocktail.imageUrl);
            const url = `${window.location.origin}${window.location.pathname}#/share/${sharedId}`;
            await navigator.clipboard.writeText(url);
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 3000);
        } catch (error) {
            console.error("Failed to create share link:", error);
            setError(t.errorContent);
        }
    }, [t]);

    const renderGenerator = () => (
        <>
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 mb-8 border border-gray-700">
                <h2 className="text-2xl font-semibold text-slate-200 mb-4">{t.yourIngredients}</h2>
                <IngredientInput
                    ingredients={ingredients}
                    onAddIngredient={handleAddIngredient}
                    onRemoveIngredient={handleRemoveIngredient}
                    placeholder={t.addPlaceholder}
                    addButtonText={t.add}
                    onScanRequest={handleScanRequest}
                    isScanning={isScanning}
                />
                <button
                    onClick={handleGenerateCocktails}
                    disabled={isLoading || ingredients.length === 0}
                    className="mt-6 w-full flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-500 text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-amber-800 disabled:text-gray-400 disabled:cursor-not-allowed transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-amber-500/50 shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20"
                >
                    {isLoading ? (
                        <>
                            <Spinner />
                            {loadingMessage || t.generating}
                        </>
                    ) : t.generate}
                </button>
            </div>

            {error && (
                <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-4 rounded-lg shadow-md mb-6" role="alert">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <p className="font-bold">{t.errorTitle}</p>
                            <p>{error}</p>
                        </div>
                        {error === t.errorGeneration && (
                            <button
                                onClick={handleGenerateCocktails}
                                disabled={isLoading}
                                className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap disabled:bg-red-400"
                            >
                                {t.retry}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-16">
                {cocktails.map((cocktail) => (
                    <CocktailCard 
                      key={cocktail.id} 
                      cocktail={cocktail} 
                      language={language}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorite={favoriteCocktails.some(fav => fav.id === cocktail.id)}
                      onShare={handleShareCocktail}
                    />
                ))}
            </div>

            {favoriteCocktails.length > 0 && (
                <section className="mt-24">
                    <h2 className="text-4xl font-bold text-slate-100 text-center mb-12">{t.myFavoriteCocktails}</h2>
                    <div className="space-y-16">
                        {favoriteCocktails.map((cocktail) => (
                            <CocktailCard 
                                key={cocktail.id} 
                                cocktail={cocktail} 
                                language={language}
                                onToggleFavorite={handleToggleFavorite}
                                isFavorite={true}
                                onShare={handleShareCocktail}
                            />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
    
    const renderSharedCocktail = () => (
        <div>
            <h2 className="text-4xl font-bold text-slate-100 text-center mb-12">{t.sharedCocktailTitle}</h2>
            <div className="max-w-5xl mx-auto">
                 {sharedCocktail && <CocktailCard 
                    key={sharedCocktail.id} 
                    cocktail={sharedCocktail} 
                    language={language}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favoriteCocktails.some(fav => fav.id === sharedCocktail.id)}
                    onShare={handleShareCocktail}
                 />}
            </div>
             <div className="text-center mt-12">
                <button
                    onClick={() => {
                        setSharedCocktail(null);
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }}
                    className="bg-amber-400 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-lg transition-colors duration-300"
                >
                    {t.backToGenerator}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen font-sans bg-gray-900">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <ConfirmationModal 
                isOpen={isModalOpen}
                initialIngredients={detectedIngredients}
                onConfirm={handleAddMultipleIngredients}
                onClose={() => setIsModalOpen(false)}
                language={language}
             />
            {showCopyToast && (
                <div className="fixed bottom-6 right-6 bg-gray-700 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out">
                    {t.linkCopied}
                </div>
            )}
            
            <div className="w-full bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
                <header className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center sm:justify-between gap-4 px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <MixMasterLogo />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">
                                {t.title}
                            </h1>
                            <p className="text-md text-slate-300">{t.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex gap-1 bg-gray-900/50 rounded-full p-1">
                        <button
                            onClick={() => setLanguage('es')}
                            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${language === 'es' ? 'bg-amber-400 text-black' : 'text-slate-200 hover:bg-gray-700/80'}`}
                            aria-label="Cambiar a Español"
                        >
                            ES
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${language === 'en' ? 'bg-amber-400 text-black' : 'text-slate-200 hover:bg-gray-700/80'}`}
                            aria-label="Switch to English"
                        >
                            EN
                        </button>
                    </div>
                </header>
            </div>

            <main className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                {sharedCocktail ? renderSharedCocktail() : renderGenerator()}
            </main>
        </div>
    );
};

export default App;
