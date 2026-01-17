# A-Level Chemistry Interactive Map

A maintainable static project for the organic chemistry reaction map. Everything lives under `src/` so you can extend
it without hunting through a single HTML file.

## Project structure

```
src/
  index.html           # Landing page
  organic-map.html     # Organic map page
  css/styles.css       # Global styles for the map view
  js/data.js           # Graph data + descriptions
  js/main.js           # UI + graph behavior
```

## Run locally

You can run a quick static server from the repo root:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000/src/` for the landing page or `http://localhost:8000/src/organic-map.html` for the map.

## Where to add new content

- **New reactions or nodes:** update `src/js/data.js`.
- **UI behavior or interactions:** edit `src/js/main.js`.
- **Layout or styling:** update `src/index.html` and `src/css/styles.css`.
