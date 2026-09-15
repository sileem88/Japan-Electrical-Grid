# Japan Transmission Grid Map

An interactive web map of Japan's electricity transmission network — transmission
lines, substations, power plants, and converter stations — traced in Google
Earth from public utility grid-connection diagrams.

**[View the live map](#)** *(add your GitHub Pages URL here once deployed)*

## What's here

- `index.html`, `css/`, `js/` — the map viewer (Leaflet.js, no build step)
- `data/map_data.geojson` — the map data, converted from the KMZ for fast web loading
- `data/送電系統図_20260915.kmz` — the original Google Earth file, offered as a download on the site
- `tools/convert_kml_to_geojson.py` — regenerates `map_data.geojson` after you edit the KMZ

## Viewing it locally

Because the map loads data with `fetch()`, opening `index.html` directly from
disk won't work in most browsers (it'll block the request). Serve it locally instead:

```bash
cd japan-transmission-map
python3 -m http.server 8000
# then open http://localhost:8000
```

## Hosting it on GitHub Pages

1. Create a new GitHub repository (e.g. `japan-transmission-map`) and push this
   folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial map"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch",
   branch `main`, folder `/ (root)`. Save.
4. GitHub builds the site (takes a minute or two) and gives you a URL like
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`.
5. Open `index.html` and set the `data-repo-url` attribute on `<body>` to your
   repo's URL so the "Contribute on GitHub" button points to the right place,
   then commit and push again.

No server, database, or build process needed — it's a static site.

## Contributing improvements

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow. In short:

1. Open `data/送電系統図_20260915.kmz` in Google Earth (Pro or web).
2. Make your edits — fix a line's routing, add a missing substation, correct a name.
3. Export the whole thing again as KMZ, replacing the file in `data/`.
4. Run `python3 tools/convert_kml_to_geojson.py` to regenerate `map_data.geojson`.
5. Open a pull request with both changed files.

## Data notes

- Line routes are traced by hand from published grid diagrams — they show
  corridors and connectivity, not surveyed pole/tower positions.
- Line color follows voltage class (500kV, 275kV, 220kV, 187kV, 154kV, 132kV,
  110kV) as set in the source KML.
- Categories: `送電線` transmission line, `変電所` substation, `発電所` power
  plant, `変換所` converter station (AC/DC interconnection).
