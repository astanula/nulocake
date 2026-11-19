export interface FontOption {
  name: string;
  min: number;
  max: number;
  googleAxes?: string;
  weights?: readonly number[];
}

// Add new preview fonts here, including their Google Fonts axes and available weights.
const FONT_CATALOG: readonly FontOption[] = [
  { name: 'Playfair Display', min: 400, max: 900, googleAxes: ':ital,wght@0,400..900;1,400..900' },
  { name: 'Epilogue', min: 300, max: 800, googleAxes: ':ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800' },
  { name: 'Cormorant Garamond', min: 300, max: 700, googleAxes: ':ital,wght@0,300..700;1,300..700' },
  { name: 'Patrick Hand', min: 400, max: 400 },
  { name: 'Fraunces', min: 100, max: 900, googleAxes: ':ital,wght@0,100..900;1,100..900' },
  { name: 'Story Script', min: 400, max: 400 },
  { name: 'Carattere', min: 400, max: 400 },
  { name: 'Kaushan Script', min: 400, max: 400 },
  { name: 'Beau Rivage', min: 400, max: 400 },
  { name: 'Bilbo', min: 400, max: 400 },
  { name: 'Oregano', min: 400, max: 400, googleAxes: ':ital@0;1' },
  { name: 'Architects Daughter', min: 400, max: 400 },
  { name: 'Just Another Hand', min: 400, max: 400 },
  { name: 'Courgette', min: 400, max: 400 },
  { name: 'Caveat Brush', min: 400, max: 400 },
  { name: 'Kalam', min: 300, max: 700, weights: [300, 400, 700], googleAxes: ':wght@300;400;700' },
  { name: 'Merienda', min: 300, max: 900, googleAxes: ':wght@300..900' },
  { name: 'Manrope', min: 300, max: 800, googleAxes: ':wght@300;400;500;600;700;800' },
  { name: 'Source Sans 3', min: 200, max: 900, googleAxes: ':ital,wght@0,200..900;1,200..900' },
  { name: 'IBM Plex Serif', min: 100, max: 700, weights: [100, 200, 300, 400, 500, 600, 700], googleAxes: ':ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700' },
  { name: 'Alegreya', min: 400, max: 900, googleAxes: ':ital,wght@0,400..900;1,400..900' },
  { name: 'Merriweather', min: 300, max: 900, weights: [300, 400, 700, 900], googleAxes: ':ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900' },
  { name: 'Lora', min: 400, max: 700, googleAxes: ':ital,wght@0,400..700;1,400..700' },
  { name: 'Bodoni Moda', min: 400, max: 900, googleAxes: ':ital,wght@0,400..900;1,400..900' },
  { name: 'Alegreya Sans', min: 100, max: 900, weights: [100, 300, 400, 500, 700, 800, 900], googleAxes: ':ital,wght@0,100;0,300;0,400;0,500;0,700;0,800;0,900;1,100;1,300;1,400;1,500;1,700;1,800;1,900' },
  { name: 'Newsreader', min: 200, max: 800, googleAxes: ':ital,wght@0,200..800;1,200..800' },
  { name: 'Recursive', min: 300, max: 1000, googleAxes: ':wght@300..1000' },
  { name: 'IBM Plex Sans', min: 100, max: 700, weights: [100, 200, 300, 400, 500, 600, 700], googleAxes: ':ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700' },
  { name: 'Fira Sans', min: 100, max: 900, weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], googleAxes: ':ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900' },
  { name: 'Jost', min: 100, max: 900, googleAxes: ':ital,wght@0,100..900;1,100..900' },
  { name: 'Merriweather Sans', min: 300, max: 800, googleAxes: ':ital,wght@0,300..800;1,300..800' },
  { name: 'Montserrat', min: 100, max: 900, googleAxes: ':ital,wght@0,100..900;1,100..900' },
  { name: 'Open Sans', min: 300, max: 800, googleAxes: ':ital,wght@0,300..800;1,300..800' },
  { name: 'Rosario', min: 300, max: 700, googleAxes: ':ital,wght@0,300..700;1,300..700' },
  { name: 'Roboto', min: 100, max: 900, googleAxes: ':ital,wght@0,100..900;1,100..900' },
  { name: 'Ubuntu', min: 300, max: 700, weights: [300, 400, 500, 700], googleAxes: ':ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700' },
  { name: 'Work Sans', min: 100, max: 900, googleAxes: ':ital,wght@0,100..900;1,100..900' },
];

const findFont = (name: string) =>
  FONT_CATALOG.find((font) => font.name.toLowerCase() === name.toLowerCase());

function requireFont(name: string): FontOption {
  const font = findFont(name);
  if (!font) throw new Error(`Font "${name}" is missing from FONT_CATALOG.`);
  return font;
}

export const DISPLAY_FONTS = [
  'Playfair Display', 'Epilogue', 'Cormorant Garamond', 'Patrick Hand', 'Fraunces',
  'Story Script', 'Carattere', 'Kaushan Script', 'Beau Rivage', 'Bilbo', 'Oregano',
  'Architects Daughter', 'Just Another Hand', 'Courgette', 'Caveat Brush', 'Kalam', 'Merienda',
  'IBM Plex Serif', 'Alegreya', 'Merriweather', 'Lora', 'Bodoni Moda',
].map(requireFont);

export const BODY_FONTS = [
  'Manrope', 'Source Sans 3', 'Patrick Hand', 'Alegreya Sans', 'Newsreader', 'Recursive',
  'IBM Plex Sans', 'IBM Plex Serif', 'Fira Sans', 'Jost', 'Merriweather Sans', 'Montserrat',
  'Open Sans', 'Rosario', 'Roboto', 'Ubuntu', 'Work Sans',
].map(requireFont);

const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong',
]);

export function getGlobalFontFamilies(css: string): string[] {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const families = ['--font-family-display', '--font-family-body'].map((variable) => {
    const match = uncommented.match(new RegExp(`${variable}\\s*:\\s*([^;]+);`));
    if (!match) throw new Error(`Missing ${variable} in global.css.`);

    const value = match[1].trim();
    const quoted = value.match(/^(['"])(.*?)\1/);
    const name = quoted ? quoted[2] : value.split(',')[0].trim();
    if (!name || name.startsWith('var(')) {
      throw new Error(`${variable} in global.css must start with a literal font family.`);
    }
    return name;
  });

  return [...new Set(families.filter((name) => !GENERIC_FAMILIES.has(name.toLowerCase())))];
}

export function googleFontsUrl(families: readonly string[]): string | null {
  const uniqueFamilies = [...new Set(families)];
  if (uniqueFamilies.length === 0) return null;

  const params = new URLSearchParams();
  for (const name of uniqueFamilies) {
    const font = findFont(name);
    params.append('family', `${font?.name ?? name}${font?.googleAxes ?? ''}`);
  }
  params.set('display', 'swap');
  return `https://fonts.googleapis.com/css2?${params.toString()}`;
}
