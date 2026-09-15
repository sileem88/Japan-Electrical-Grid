#!/usr/bin/env python3
"""
Converts the project's KMZ (Google Earth) file into the GeoJSON used by the
web map, resolving KML styles/colors and preserving folder hierarchy
(category > company > voltage group) as feature properties.

Usage:
    pip install lxml
    python3 tools/convert_kml_to_geojson.py

Reads:  data/送電系統図_20260915.kmz  (edit KML_ZIP below if you rename it)
Writes: data/map_data.geojson
"""
import json
import zipfile
import shutil
import os
from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KML_ZIP = os.path.join(ROOT, "data", "送電系統図_20260915.kmz")
OUTPUT = os.path.join(ROOT, "data", "map_data.geojson")

NS = {"kml": "http://www.opengis.net/kml/2.2"}


def kml_color_to_hex(kml_color):
    # KML color order is aabbggrr
    if not kml_color or len(kml_color) != 8:
        return "#ff0000"
    aa, bb, gg, rr = kml_color[0:2], kml_color[2:4], kml_color[4:6], kml_color[6:8]
    return f"#{rr}{gg}{bb}"


def main():
    extract_dir = os.path.join(HERE, "_extracted")
    if os.path.exists(extract_dir):
        shutil.rmtree(extract_dir)
    os.makedirs(extract_dir)

    with zipfile.ZipFile(KML_ZIP) as z:
        z.extract("doc.kml", extract_dir)

    tree = etree.parse(os.path.join(extract_dir, "doc.kml"))
    root = tree.getroot()

    styles = {}
    for style in root.iter("{http://www.opengis.net/kml/2.2}Style"):
        sid = style.get("id")
        if not sid:
            continue
        line = style.find("kml:LineStyle", NS)
        color, width = None, None
        if line is not None:
            c = line.find("kml:color", NS)
            w = line.find("kml:width", NS)
            if c is not None and c.text:
                color = kml_color_to_hex(c.text.strip())
            if w is not None and w.text:
                width = float(w.text.strip())
        styles[sid] = {"color": color, "width": width}

    stylemaps = {}
    for sm in root.iter("{http://www.opengis.net/kml/2.2}StyleMap"):
        smid = sm.get("id")
        if not smid:
            continue
        for pair in sm.findall("kml:Pair", NS):
            key = pair.find("kml:key", NS)
            url = pair.find("kml:styleUrl", NS)
            if key is not None and key.text == "normal" and url is not None:
                stylemaps[smid] = url.text.lstrip("#")

    def resolve_style(style_url):
        if not style_url:
            return {"color": "#ff0000", "width": 3}
        sid = style_url.lstrip("#")
        if sid in stylemaps:
            sid = stylemaps[sid]
        s = styles.get(sid, {})
        return {"color": s.get("color") or "#ff0000", "width": s.get("width") or 3}

    features = []

    def walk(elem, path):
        for child in elem:
            tag = etree.QName(child).localname
            if tag == "Folder":
                name_el = child.find("kml:name", NS)
                name = name_el.text.strip() if name_el is not None and name_el.text else "Unnamed"
                walk(child, path + [name])
            elif tag == "Placemark":
                name_el = child.find("kml:name", NS)
                name = name_el.text.strip() if name_el is not None and name_el.text else ""
                style_url_el = child.find("kml:styleUrl", NS)
                style_url = style_url_el.text.strip() if style_url_el is not None and style_url_el.text else None
                style = resolve_style(style_url)

                ls = child.find(".//kml:LineString", NS)
                pt = child.find(".//kml:Point", NS)
                geom = None
                if ls is not None:
                    coords_el = ls.find("kml:coordinates", NS)
                    if coords_el is not None and coords_el.text:
                        coords = []
                        for c in coords_el.text.strip().split():
                            parts = c.split(",")
                            if len(parts) >= 2:
                                coords.append([float(parts[0]), float(parts[1])])
                        if len(coords) >= 2:
                            geom = {"type": "LineString", "coordinates": coords}
                elif pt is not None:
                    coords_el = pt.find("kml:coordinates", NS)
                    if coords_el is not None and coords_el.text:
                        parts = coords_el.text.strip().split(",")
                        if len(parts) >= 2:
                            geom = {"type": "Point", "coordinates": [float(parts[0]), float(parts[1])]}

                if geom is None:
                    continue

                props = {
                    "name": name,
                    "color": style["color"],
                    "width": style["width"],
                    "category": path[0] if len(path) > 0 else "",
                    "company": path[1] if len(path) > 1 else "",
                    "group": path[2] if len(path) > 2 else "",
                }
                features.append({"type": "Feature", "geometry": geom, "properties": props})

    doc = root.find("kml:Document", NS)
    walk(doc, [])

    fc = {"type": "FeatureCollection", "features": features}
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))

    shutil.rmtree(extract_dir)
    print(f"Wrote {OUTPUT}: {len(features)} features")


if __name__ == "__main__":
    main()
