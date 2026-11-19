// Image URLs that work both at the site root and under a sub-path such as the
// GitHub Pages project URL /<repository name>/. Vite sets BASE_URL from `base`
// (BASE_PATH env var, see vite.config.ts). The engine scripts (npm test,
// npm run sim) import this under plain Node, where import.meta.env is
// undefined, so fall back to '/'.
const BASE_URL: string = import.meta.env?.BASE_URL ?? '/';

export function assetUrl(path: string): string {
  return `${BASE_URL}${path}`;
}
