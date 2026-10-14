# The12thHouse

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

For GitHub Pages, the repository's production base path is `/The12thHouse/`,
and the currently configured Pages source is the legacy `gh-pages` branch.
The command below builds with that base path, verifies the generated asset
paths, and publishes `dist` to the configured `gh-pages` source.

The repository also contains a GitHub Actions Pages workflow, but the current
repository Pages setting is not configured to use Actions as its publishing
source. Do not treat a workflow run alone as proof that it published the live
site.

```bash
npm run deploy
```
