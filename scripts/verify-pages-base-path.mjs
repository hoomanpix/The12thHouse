import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const expectedPrefix = '/The12thHouse/assets/';
const stalePrefix = '/new-wave/assets/';
const assetReferences = [...html.matchAll(/(?:src|href)="([^\"]+\/assets\/[^\"]+)"/g)].map((match) => match[1]);

if (assetReferences.length === 0) {
  throw new Error('No generated JavaScript or CSS asset references were found in dist/index.html.');
}

const invalidReferences = assetReferences.filter((reference) => !reference.startsWith(expectedPrefix));
if (invalidReferences.length > 0 || html.includes(stalePrefix)) {
  throw new Error(`Generated Pages asset paths are invalid: ${invalidReferences.join(', ') || stalePrefix}`);
}

if (!assetReferences.some((reference) => reference.endsWith('.js')) || !assetReferences.some((reference) => reference.endsWith('.css'))) {
  throw new Error('Generated dist/index.html must reference both JavaScript and CSS assets.');
}

console.log(`Verified ${assetReferences.length} GitHub Pages asset references under ${expectedPrefix}`);
