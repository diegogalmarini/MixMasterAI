import React, { useState, useEffect } from 'react';

const locales = {
    en: {
        title: "Detected Ingredients",
        instructions: "Review the ingredients found in your image. Remove any that are incorrect before adding them to your list.",
        confirm: "Add Selected Ingredients",
        cancel: "Cancel",
        noIngredients: "No ingredients detected."
    },
    es: {
        title: "Ingredientes Detectados",
        instructions: "Revisa los ingredientes encontrados en tu imagen. Elimina los que sean incorrectos antes de añadirlos a tu lista.",
        confirm: "Añadir Ingredientes",
        cancel: "Cancelar",
        noIngredients: "No se detectaron ingredientes."
    }
};


interface ConfirmationModalProps {
    isOpen: boolean;
    initialIngredients: string[];
    onConfirm: (ingredients: string[]) => void;
    onClose: () => void;
    language: 'en' | 'es';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, initialIngredients, onConfirm, onClose, language }) => {
    const [currentIngredients, setCurrentIngredients] = useState<string[]>(initialIngredients);

    const t = locales[language];

    useEffect(() => {
        if (isOpen) {
            setCurrentIngredients(initialIngredients);
        }
    }, [isOpen, initialIngredients]);

    const handleRemoveIngredient = (ingredientToRemove: string) => {
        setCurrentIngredients(currentIngredients.filter(ing => ing !== ingredientToRemove));
    };



    const handleConfirm = () => {
        onConfirm(currentIngredients);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 transform transition-all border border-gray-700 shadow-[0_0_30px_rgba(236,72,153,0.3)]" role="document">
                <h2 className="text-2xl font-bold text-slate-100 mb-2">{t.title}</h2>
                <p className="text-slate-300 mb-6">{t.instructions}</p>
                
                <div className="max-h-60 overflow-y-auto pr-2 -mr-2 mb-6 space-y-2 overscroll-contain">
                     {currentIngredients.length > 0 ? (
                        currentIngredients.map(ingredient => (
                            <div key={ingredient} className="flex items-center justify-between bg-gray-700 text-slate-200 text-sm font-medium px-3 py-2 rounded-lg">
                                <span>{ingredient}</span>
                                <button
                                    onClick={() => handleRemoveIngredient(ingredient)}
                                    className="ml-2 text-red-400 hover:text-red-500"
                                    aria-label={`Remove ${ingredient}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))
                     ) : (
                         <p className="text-slate-400 text-center py-4">{t.noIngredients}</p>
                     )}
                </div>

                <div className="flex flex-col sm:flex-row-reverse gap-3">
                    <button
                        onClick={handleConfirm}
                        disabled={currentIngredients.length === 0}
                        className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 text-black font-bold py-2 px-6 rounded-lg transition-colors duration-300 disabled:bg-amber-800 disabled:text-gray-500"
                    >
                        {t.confirm} ({currentIngredients.length})
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-slate-200 font-bold py-2 px-6 rounded-lg transition-colors"
                    >
                        {t.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;