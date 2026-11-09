# USCGA Boards Packet Practice

A browser-only study tool for studying the United States Coast Guard Academy boards packet.

It covers the full boards packet except the Chapter 2 appearance and grooming standards: the Academy mission, Coast Guard ethos, General Orders of the Sentry, helm and line-handling commands, radio prowords and procedures, Coast Guard missions, customs and courtesies (etiquette, colors, shipboard customs, saluting), damage control and the four classes of fires, the basic nautical dictionary, officer and enlisted ranks, enlisted ratings, nautical flags, flags and ensigns, common lights and dayshapes, recognized distress signals, Coast Guard assets, and an interactive Coast Guard districts map.

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for architecture and how to add more sets, and [`docs/CONTENT-STATUS.md`](docs/CONTENT-STATUS.md) for the full packet page map and what is still to be added.

## Study modes

- **Study**: browse packet items with answers visible.
- **Matching**: match prompts and answers in either direction.
- **Recall**: type definitions, reverse answers, and missing words.
- **Exact**: type complete packet wording and compare it with the source.

## Run locally

Open `index.html` in a browser. The app has no build step or server dependency. For local JSON loading, use a small static HTTP server rather than opening the file directly.

## GitHub Pages

This repository is a static site. In GitHub, enable Pages from the repository settings and deploy the branch containing `index.html` from its root folder.

## Asset cache busting

GitHub Pages serves static assets that browsers may cache. The HTML uses the current release commit as a query-string version on the CSS, JavaScript, favicon, and packet JSON URLs. When publishing a future change, update every `?v=...` value in `index.html` and `data.js` to the new commit's short hash before pushing. This gives changed assets a new URL while leaving older cached assets harmless.

## Privacy

Practice progress, mastery, theme, and focus preferences are stored in the browser with `localStorage`. The app does not upload study activity to a server. Clearing browser storage removes progress.

## Content note

The packet wording is based on the provided source material. Verify that you have permission to publish the source content and decide how apparent source typos should be handled for exact memorization.
