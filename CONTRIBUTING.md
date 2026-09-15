# Contributing to the map

Thanks for helping improve this map. Everything lives in one Google Earth
file, so contributing doesn't require any coding — just Google Earth and a
GitHub pull request.

## 1. Get the current map

Download `data/送電系統図_20260915.kmz` from this repo, or clone the repo and
open that file directly. Open it in [Google Earth Pro](https://www.google.com/earth/about/versions/#earth-pro)
(desktop) or [Google Earth Web](https://earth.google.com/web/).

## 2. Make your edit

Some examples of useful contributions:

- Correcting a transmission line's routing where it doesn't match the real corridor
- Adding a missing substation, power plant, or line
- Fixing a name, voltage label, or company attribution
- Splitting an overly simplified line into a more accurate path

Please keep edits **inside the existing folder structure** — new placemarks
should go in the right folder (company → category → voltage, where applicable)
so the site's layer toggles and legend keep working correctly. Existing
placemarks carry their color/voltage via KML line styles; if you add a new
line, copy the style of a neighboring line at the same voltage rather than
inventing a new color.

## 3. Export

In Google Earth: select the top-level folder → **File → Save → Save Place
As...** → save as **KMZ**, overwriting `送電系統図_20260915.kmz` (or save
under a new name if you'd rather keep the original file name — mention it in
your PR either way).

## 4. Regenerate the web data

The site doesn't read the KMZ directly — it reads a converted GeoJSON file for
performance. After exporting, regenerate it:

```bash
pip install lxml
python3 tools/convert_kml_to_geojson.py
```

This overwrites `data/map_data.geojson`. Commit both the updated KMZ and the
regenerated GeoJSON together.

## 5. Open a pull request

Fork the repo, push your branch, and open a PR describing what changed and
why (e.g. "corrected routing of Tohoku EPCo 275kV Sendai–Furukawa line based
on [source]"). If you're citing a source for the correction, please link it —
it makes review much faster.

## Reporting an issue without editing it yourself

If you've spotted a problem but don't want to edit the KMZ yourself, open a
GitHub Issue describing the location and what looks wrong (a screenshot or
coordinates helps a lot).
