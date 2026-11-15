import type { Plugin } from 'vite';
import { CUSTOM_MEDIA, TIER_MIN_WIDTH_PX, type CustomMediaToken } from '../config/responsive';

function maskBlockComments(code: string) {
  return code.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '));
}

function getLocation(code: string, offset: number) {
  const before = code.slice(0, offset);
  const line = before.split('\n').length;
  const lastNewline = before.lastIndexOf('\n');
  return { line, column: offset - lastNewline - 1 };
}

export function responsiveMediaPlugin(): Plugin {
  return {
    name: 'nulocake-responsive-media',
    enforce: 'pre',
    transform(code, id) {
      const normId = id.replaceAll('\\', '/');
      const cleanPath = normId.split('?')[0];
      const isAuthoredCss =
        !normId.includes('/node_modules/') &&
        normId.includes('/src/') &&
        (cleanPath.endsWith('.css') || normId.includes('&lang.css'));

      if (!isAuthoredCss) return null;

      const maskedCode = maskBlockComments(code);
      const mediaPattern = /@media\s+([^{]+)\{/g;
      const replacements: Array<{ start: number; end: number; value: string }> = [];

      for (const mediaMatch of maskedCode.matchAll(mediaPattern)) {
        const prelude = mediaMatch[1];
        const preludeStart = (mediaMatch.index ?? 0) + mediaMatch[0].indexOf(prelude);
        const rawWidthMatch = prelude.match(
          /\b(?:min-width|max-width|device-width)\b|\bwidth\s*(?:<=|>=|<|>|:)/,
        );

        if (rawWidthMatch) {
          const rawMatchOffset = preludeStart + (rawWidthMatch.index ?? 0);
          this.error({
            message:
              'Raw width media queries are not allowed. Use a @media (--...) token from CUSTOM_MEDIA in src/config/responsive.ts instead.',
            id: cleanPath,
            loc: { file: cleanPath, ...getLocation(code, rawMatchOffset) },
          });
        }

        for (const tokenMatch of prelude.matchAll(/\(--[a-zA-Z0-9_-]+\)/g)) {
          const token = tokenMatch[0].slice(1, -1) as CustomMediaToken;
          const tokenStart = preludeStart + (tokenMatch.index ?? 0);
          const replacement = CUSTOM_MEDIA[token];

          if (!replacement) {
            this.error({
              message: `Unknown custom media token "${token}". Valid tokens: ${Object.keys(CUSTOM_MEDIA).join(', ')}`,
              id: cleanPath,
              loc: { file: cleanPath, ...getLocation(code, tokenStart) },
            });
          }

          replacements.push({
            start: tokenStart,
            end: tokenStart + tokenMatch[0].length,
            value: replacement,
          });
        }
      }

      let transformed = code;
      for (const replacement of replacements.reverse()) {
        transformed =
          transformed.slice(0, replacement.start) +
          replacement.value +
          transformed.slice(replacement.end);
      }

      if (cleanPath.endsWith('/src/styles/global.css')) {
        const themeTokens = [
          '--breakpoint-*: initial;',
          `--breakpoint-mobile: ${TIER_MIN_WIDTH_PX.mobile}px;`,
          `--breakpoint-tablet: ${TIER_MIN_WIDTH_PX.tablet}px;`,
          `--breakpoint-laptop: ${TIER_MIN_WIDTH_PX.laptop}px;`,
          `--breakpoint-desktop: ${TIER_MIN_WIDTH_PX.desktop}px;`,
          `--breakpoint-large-desktop: ${TIER_MIN_WIDTH_PX.largeDesktop}px;`,
        ].join('\n  ');
        transformed = transformed.replace(/@theme\s*\{/, (theme) => `${theme}\n  ${themeTokens}`);
      }

      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}
