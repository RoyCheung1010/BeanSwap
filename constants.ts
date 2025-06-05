
import { RoastProfile, FlavorProfile } from './types';

export const ROAST_OPTIONS: RoastProfile[] = [
  RoastProfile.LIGHT,
  RoastProfile.MEDIUM,
  RoastProfile.DARK,
];

export const FLAVOR_PROFILES_OPTIONS: FlavorProfile[] = [
  { id: '1', name: 'Fruity' },
  { id: '2', name: 'Chocolatey' },
  { id: '3', name: 'Nutty' },
  { id: '4', name: 'Spicy' },
  { id: '5', name: 'Floral' },
  { id: '6', name: 'Earthy' },
  { id: '7', name: 'Caramel' },
  { id: '8', name: 'Citrus' },
];

export const GEMINI_API_KEY_INFO = "Gemini API functionality requires the API_KEY environment variable to be set.";
export const GEMINI_DESCRIPTION_PROMPT_TEMPLATE = (origin: string, roast: string): string => 
  `Generate a captivating coffee bean description for beans from ${origin} with a ${roast} roast. 
  Highlight potential flavor notes and aroma. Be enthusiastic and appealing to coffee lovers. 
  Keep it under 100 words. Do not use markdown.`;

export const DEFAULT_BEAN_IMAGE = 'https://picsum.photos/seed/coffeebean/400/300';
