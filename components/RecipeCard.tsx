import React, { useState } from 'react';
import type { Cocktail, ImageState } from '../types';
import jsPDF from 'jspdf';
import DifficultyMeter from './DifficultyMeter';

const localeStrings = {
    en: {
        imageFailed: "Image generation failed.",
        imageFailedQuota: "Image quota exceeded.",
        plating: "Garnishing your drink...",
        prep: 'Prep',
        ingredients: 'Ingredients',
        instructions: 'Instructions',
        garnish: 'Garnish',
        glassware: 'Glassware',
        flavorProfile: 'Flavor Profile',
        suggested: 'suggested',
        favorite: 'Favorite',
        share: 'Share',
        pdf: 'PDF',
        removeFromFavorites: 'Remove from favorites',
        addToFavorites: 'Add to favorites',
        shareCocktail: 'Share cocktail',
        downloadPdf: 'Download PDF',
        difficulty: 'Difficulty',
    },
    es: {
        imageFailed: "Falló la generación de imagen.",
        imageFailedQuota: "Se excedió la cuota de imágenes.",
        plating: "Adornando tu bebida...",
        prep: 'Prep',
        ingredients: 'Ingredientes',
        instructions: 'Instrucciones',
        garnish: 'Garnitura',
        glassware: 'Cristalería',
        flavorProfile: 'Perfil de Sabor',
        suggested: 'sugerido',
        favorite: 'Favorito',
        share: 'Compartir',
        pdf: 'PDF',
        removeFromFavorites: 'Quitar de favoritos',
        addToFavorites: 'Añadir a favoritos',
        shareCocktail: 'Compartir cóctel',
        downloadPdf: 'Descargar PDF',
        difficulty: 'Dificultad',
    }
};

const ImagePlaceholder = ({ state, language }: { state: ImageState | undefined, language: 'en' | 'es' }) => {
    const t = localeStrings[language];
    
    let content;
    if (state === 'error' || state === 'error_quota') {
        const message = state === 'error_quota' ? t.imageFailedQuota : t.imageFailed;
        content = (
             <div className="flex flex-col items-center justify-center text-center p-4 h-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mb-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-slate-400">{message}</p>
            </div>
        );
    } else {
        content = (
             <div className="flex flex-col items-center justify-center text-center p-4 h-full">
                <svg className="animate-spin h-8 w-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-semibold text-slate-300 mt-2">{t.plating}</p>
             </div>
        );
    }
    
    return (
        <div className="w-full aspect-[16/9] bg-gray-700 flex items-center justify-center">
            {content}
        </div>
    );
};

const urlToDataUrl = (url: string): Promise<{ dataUrl: string; width: number; height: number; }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to get canvas context'));
      }
      ctx.drawImage(img, 0, 0);
      resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          width: img.naturalWidth,
          height: img.naturalHeight
      });
    };
    img.onerror = (err) => {
      reject(new Error(`Failed to load image from url: ${url}. Error: ${err}`));
    };
    img.src = url;
  });

interface CocktailCardProps {
    cocktail: Cocktail;
    language: 'en' | 'es';
    onToggleFavorite: (cocktail: Cocktail) => void;
    isFavorite: boolean;
    onShare: (cocktail: Cocktail) => void;
}

const CocktailCard: React.FC<CocktailCardProps> = ({ cocktail, language, onToggleFavorite, isFavorite, onShare }) => {
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const t = localeStrings[language];
    
    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);

        const generateCocktailPdf = async (cocktailProp: Cocktail) => {
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

            const difficultyTranslations = {
                en: { 'Very Easy': 'Very Easy', 'Easy': 'Easy', 'Medium': 'Medium', 'Hard': 'Hard', 'Expert': 'Expert' },
                es: { 'Very Easy': 'Muy Fácil', 'Easy': 'Fácil', 'Medium': 'Medio', 'Hard': 'Difícil', 'Expert': 'Experto' }
            };

            const cocktailData = {
                imageUrl: cocktailProp.imageUrl,
                title: cocktailProp.cocktailName,
                description: cocktailProp.description,
                stats: {
                    prepTime: cocktailProp.prepTime,
                    difficulty: difficultyTranslations[language][cocktailProp.difficulty] || cocktailProp.difficulty,
                    glassware: cocktailProp.glassware,
                    flavor: cocktailProp.flavorProfile,
                },
                ingredients: cocktailProp.ingredients.map(ing => `${ing.quantity} ${ing.name}${ing.isGarnish ? ` (${t.suggested})` : ''}`),
                instructions: cocktailProp.instructions,
                garnish: {
                    title: t.garnish.toUpperCase(),
                    text: cocktailProp.garnish
                }
            };

            const PAGE_W = doc.internal.pageSize.getWidth();
            const MARGIN = 15;
            const CONTENT_W = PAGE_W - MARGIN * 2;
            let yPos = 0;

            const COLORS = {
                HEADER_BG: '#18181b',
                ACCENT_GOLD: '#f59e0b',
                WHITE: '#FFFFFF',
                DARK_TEXT: '#1E293B',
                MEDIUM_TEXT: '#475569',
                LIGHT_TEXT: '#9CA3AF',
                STATS_BG: '#f4f4f5',
                TIP_BG: '#fefce8',
            };
            
            const drawMixMasterLogo = (doc: jsPDF, x: number, y: number, size: number) => {
                doc.setFillColor(COLORS.ACCENT_GOLD);
                doc.setDrawColor(COLORS.ACCENT_GOLD);
                const strokeWidth = size * 0.02;
                doc.setLineWidth(strokeWidth);

                // Base
                doc.rect(x + 0.2*size, y + 0.9*size, 0.6*size, 0.05*size, 'F');
                // Stem
                doc.rect(x + 0.45*size, y + 0.6*size, 0.1*size, 0.3*size, 'F');
                // Glass
                doc.triangle(x + 0.1*size, y + 0.05*size, x + 0.9*size, y + 0.05*size, x + 0.5*size, y + 0.6*size, 'F');
                // "Olive"
                doc.circle(x + 0.5*size, y + 0.2*size, 0.05*size, 'F');
                // Sparkles
                doc.line(x + 0.45*size, y + 0.2*size, x + 0.25*size, y + 0.1*size);
                doc.line(x + 0.55*size, y + 0.2*size, x + 0.75*size, y + 0.1*size);
                doc.line(x + 0.5*size, y + 0.25*size, x + 0.5*size, y + 0.4*size);
            };

            // --- HEADER ---
            doc.setFillColor(COLORS.HEADER_BG);
            doc.rect(0, 0, PAGE_W, 30, 'F');

            const logoSize = 12;
            const logoPadding = 4;
            drawMixMasterLogo(doc, MARGIN, (30 - logoSize) / 2, logoSize);
            
            const textStartX = MARGIN + logoSize + logoPadding;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(COLORS.WHITE);
            doc.text("MixMasterAI", textStartX, 15);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text(language === 'es' ? "Crea el cóctel perfecto con los ingredientes que tienes." : "Craft the perfect cocktail with the ingredients you have.", textStartX, 22);
            yPos = 30 + 12;

            // --- IMAGE ---
            if (cocktailData.imageUrl) {
                try {
                    const { dataUrl, width, height } = await urlToDataUrl(cocktailData.imageUrl);
                    const aspectRatio = width / height;
                    const imgWidth = 120;
                    const imgHeight = imgWidth / aspectRatio;
                    const imgX = (PAGE_W - imgWidth) / 2;
                    doc.addImage(dataUrl, 'JPEG', imgX, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 10;
                } catch (e) {
                    console.error("Could not add image to PDF", e);
                    yPos += 10;
                }
            }

            // --- TITLE & DESC ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(COLORS.DARK_TEXT);
            const titleLines = doc.splitTextToSize(cocktailData.title, CONTENT_W * 0.9);
            const titleHeight = doc.getTextDimensions(titleLines).h;
            doc.text(titleLines, PAGE_W / 2, yPos, { align: 'center' });
            yPos += titleHeight + 3;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(COLORS.MEDIUM_TEXT);
            const descLines = doc.splitTextToSize(cocktailData.description, CONTENT_W * 0.95);
            const descHeight = doc.getTextDimensions(descLines).h;
            doc.text(descLines, PAGE_W / 2, yPos, { align: 'center' });
            yPos += descHeight + 10;

            // --- STATS BAR ---
            doc.setFillColor(COLORS.STATS_BG);
            doc.roundedRect(MARGIN, yPos, CONTENT_W, 20, 5, 5, 'F');
            const stats = [
                { label: t.prep.toUpperCase(), value: cocktailData.stats.prepTime },
                { label: t.difficulty.toUpperCase(), value: cocktailData.stats.difficulty },
                { label: t.glassware.toUpperCase(), value: cocktailData.stats.glassware },
                { label: t.flavorProfile.toUpperCase(), value: cocktailData.stats.flavor },
            ];
            stats.forEach((stat, i) => {
                const colX = MARGIN + (CONTENT_W / 4) * (i + 0.5);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(COLORS.LIGHT_TEXT);
                doc.text(stat.label, colX, yPos + 8, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(COLORS.DARK_TEXT);
                doc.text(stat.value, colX, yPos + 15, { align: 'center' });
            });
            yPos += 20 + 12;


            // --- 2-COLUMN LAYOUT ---
            const colStartY = yPos;
            const COL_GAP = 10;
            const COL_WIDTH = (CONTENT_W - COL_GAP) / 2;
            const COL1_X = MARGIN;
            const COL2_X = MARGIN + COL_WIDTH + COL_GAP;
            const lineHeight = 1.4;

            // Ingredients Column
            let yPosLeft = colStartY;
            doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(COLORS.DARK_TEXT);
            doc.text(t.ingredients, COL1_X, yPosLeft);
            yPosLeft += 6;
            doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(COLORS.MEDIUM_TEXT);
            cocktailData.ingredients.forEach(ing => {
                const lines = doc.splitTextToSize(ing, COL_WIDTH - 5);
                const textHeight = doc.getTextDimensions(lines, { lineHeightFactor: lineHeight } as any).h;
                doc.setFillColor(COLORS.ACCENT_GOLD);
                doc.circle(COL1_X + 1.5, yPosLeft, 1, 'F');
                doc.text(lines, COL1_X + 5, yPosLeft, { lineHeightFactor: lineHeight });
                yPosLeft += textHeight + 2;
            });

            // Instructions Column
            let yPosRight = colStartY;
            doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(COLORS.DARK_TEXT);
            doc.text(t.instructions, COL2_X, yPosRight);
            yPosRight += 6;
            doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(COLORS.MEDIUM_TEXT);
            cocktailData.instructions.forEach((step, i) => {
                const lines = doc.splitTextToSize(step, COL_WIDTH - 8);
                const textHeight = doc.getTextDimensions(lines, { lineHeightFactor: lineHeight } as any).h;
                if (yPosRight + textHeight > doc.internal.pageSize.getHeight() - 25) {
                    return;
                }
                doc.setFillColor(COLORS.ACCENT_GOLD);
                doc.circle(COL2_X + 2.5, yPosRight + 1, 2.5, 'F');
                doc.setTextColor(COLORS.WHITE).setFont('helvetica', 'bold').setFontSize(8);
                doc.text(String(i + 1), COL2_X + 2.5, yPosRight + 2.2, { align: 'center' });
                doc.setTextColor(COLORS.MEDIUM_TEXT).setFont('helvetica', 'normal').setFontSize(9.5);
                doc.text(lines, COL2_X + 8, yPosRight, { lineHeightFactor: lineHeight });
                yPosRight += textHeight + 3;
            });
            
            yPos = Math.max(yPosLeft, yPosRight) + 10;

            // --- GARNISH TIP ---
            if(cocktailData.garnish.text && yPos < doc.internal.pageSize.getHeight() - 35) {
                doc.setFillColor(COLORS.TIP_BG);
                const tipLines = doc.splitTextToSize(cocktailData.garnish.text, CONTENT_W - 15);
                const tipHeight = doc.getTextDimensions(tipLines, { lineHeightFactor: 1.5 } as any).h + 15;
                doc.rect(MARGIN, yPos, CONTENT_W, tipHeight, 'F');
                doc.setFillColor(COLORS.ACCENT_GOLD);
                doc.rect(MARGIN, yPos, 2, tipHeight, 'F');
                doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor('#D97706'); // amber-600
                doc.text(cocktailData.garnish.title, MARGIN + 10, yPos + 7);
                doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(COLORS.MEDIUM_TEXT);
                doc.text(tipLines, MARGIN + 10, yPos + 14, { lineHeightFactor: 1.5 });
            }
            
            // --- FOOTER ---
            doc.setFontSize(8).setTextColor(COLORS.LIGHT_TEXT);
            doc.text("Generated by MixMasterAI", PAGE_W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
            
            const sanitizedTitle = cocktailData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            doc.save(`mixmaster_${sanitizedTitle}.pdf`);
        };

        try {
            await generateCocktailPdf(cocktail);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    return (
        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
            {cocktail.imageState === 'success' && cocktail.imageUrl ? (
                <img src={cocktail.imageUrl} alt={cocktail.cocktailName} className="w-full h-64 md:h-80 object-cover" />
            ) : (
                <ImagePlaceholder state={cocktail.imageState} language={language} />
            )}
            
            <div className="p-6 md:p-8">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">{cocktail.cocktailName}</h3>
                <p className="text-slate-300 mt-2">{cocktail.description}</p>
                
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-center bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                     <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t.prep}</p>
                        <p className="text-xl font-bold text-slate-100 mt-1">{cocktail.prepTime}</p>
                    </div>
                     <div>
                        <DifficultyMeter difficulty={cocktail.difficulty} language={language} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t.glassware}</p>
                        <p className="text-xl font-bold text-slate-100 mt-1">{cocktail.glassware}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t.flavorProfile}</p>
                        <p className="text-xl font-bold text-slate-100 mt-1">{cocktail.flavorProfile}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 mt-8">
                    <div>
                        <h4 className="text-2xl font-bold text-slate-100 mb-4">{t.ingredients}</h4>
                        <ul className="space-y-2 text-slate-300">
                            {cocktail.ingredients.map((ing, i) => (
                                <li key={i} className="flex items-start">
                                   <span className="text-amber-400 font-bold mr-2 mt-1">&#10003;</span>
                                   <span> <span className="font-semibold">{ing.quantity}</span> {ing.name}
                                    {ing.isGarnish && <em className="text-xs text-slate-400 ml-1">({t.suggested})</em>}
                                   </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-8 md:mt-0">
                        <h4 className="text-2xl font-bold text-slate-100 mb-4">{t.instructions}</h4>
                        <ol className="space-y-4 text-slate-300">
                            {cocktail.instructions.map((step, i) => (
                                <li key={i} className="flex">
                                    <span className="bg-amber-400 text-black rounded-full w-6 h-6 text-sm font-bold flex items-center justify-center mr-3 flex-shrink-0 mt-1">{i + 1}</span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
                
                {cocktail.garnish && (
                    <div className="mt-8 bg-amber-900/40 border-l-4 border-amber-400 text-amber-200 p-4 rounded-r-lg">
                        <p className="font-bold">{t.garnish}</p>
                        <p className="italic">{cocktail.garnish}</p>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-700 flex flex-wrap items-center justify-center gap-4">
                    <button 
                        onClick={() => onToggleFavorite(cocktail)}
                        className={`p-2 rounded-full transition-colors flex items-center gap-2 px-4 text-sm font-medium ${isFavorite ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-700 text-slate-300 hover:bg-gray-600'}`}
                        aria-label={isFavorite ? t.removeFromFavorites : t.addToFavorites}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span>{t.favorite}</span>
                    </button>
                    <button 
                        onClick={() => onShare(cocktail)}
                        className="p-2 bg-gray-700 text-slate-300 hover:bg-gray-600 rounded-full transition-colors flex items-center gap-2 px-4 text-sm font-medium"
                        aria-label={t.shareCocktail}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                        <span>{t.share}</span>
                    </button>
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="p-2 bg-gray-700 text-slate-300 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2 px-4 text-sm font-medium"
                        aria-label={t.downloadPdf}
                    >
                        {isDownloadingPdf ? (
                             <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                           </svg>
                        )}
                         <span>{t.pdf}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CocktailCard;