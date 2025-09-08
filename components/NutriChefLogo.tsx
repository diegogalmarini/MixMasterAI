import React from 'react';

/**
 * Renders the official MixMasterAI SVG logo.
 * The logo is a stylized martini glass.
 */
const MixMasterLogo: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" fill="white" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="MixMasterAI logo">
    <path d="M20 95 L 80 95 L 80 90 L 20 90 Z" />
    <path d="M45 90 L 55 90 L 55 60 L 45 60 Z" />
    <path d="M10 5 L 90 5 L 50 60 Z" />
    <circle cx="50" cy="20" r="5" />
    <path d="M45 20 L 25 10" stroke="white" strokeWidth="2" />
    <path d="M55 20 L 75 10" stroke="white" strokeWidth="2" />
    <path d="M50 25 L 50 40" stroke="white" strokeWidth="2" />
  </svg>
);

export default MixMasterLogo;
