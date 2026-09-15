# New Wave

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Production deployment

The default production build is configured for a root-domain deployment such as
Vercel:

```bash
npm run build
```

Vercel will use `vercel.json` and serve the generated app from `/`. To publish,
connect this repository to a Vercel project or run `vercel --prod` after logging
in to Vercel.

For GitHub Pages, use the existing deploy command. It builds with the
`/new-wave/` repository base path before publishing `dist`.

```bash
npm run deploy
```
