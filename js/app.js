(function () {
  "use strict";

  var CATEGORY_LABELS = {
    "送電線": "Transmission line",
    "変電所": "Substation",
    "発電所": "Power plant",
    "変換所": "Converter station"
  };

  var CATEGORY_POINT_COLOR = {
    "変電所": "#4a90d9",
    "発電所": "#e8734a",
    "変換所": "#a86fd1"
  };

  var VOLTAGE_ORDER = ["500kV", "275kV", "220kV", "187kV", "154kV", "132kV", "110kV", "100kV・110kV"];

  var map = L.map("map", {
    zoomControl: true,
    minZoom: 5,
    maxZoom: 16,
    preferCanvas: true
  }).setView([37.9, 138.2], 6);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19,
    pane: "shadowPane"
  }).addTo(map);

  var canvasRenderer = L.canvas({ padding: 0.5 });

  var state = {
    category: { "送電線": true, "変電所": true, "発電所": true, "変換所": true },
    company: ""
  };

  var allFeatures = [];
  var companySet = {};
  var dataLayer = null;

  function normalizeCompany(name) {
    // strip full-width space + trailing category word, e.g. "東京電力　送電線" -> "東京電力"
    return (name || "").replace(/\u3000.*$/, "").trim();
  }

  function featureMatchesFilters(props) {
    if (!state.category[props.category]) return false;
    if (state.company) {
      var norm = normalizeCompany(props.company);
      if (norm !== state.company) return false;
    }
    return true;
  }

  function popupHtml(props) {
    var label = CATEGORY_LABELS[props.category] || props.category;
    var company = normalizeCompany(props.company);
    var bits = [];
    if (company) bits.push(company);
    if (props.group) bits.push('<span class="kv">' + escapeHtml(props.group) + "</span>");
    return (
      '<p class="popup-title">' + escapeHtml(props.name || label) + "</p>" +
      '<p class="popup-meta">' + escapeHtml(label) + (bits.length ? " &middot; " + bits.join(" &middot; ") : "") + "</p>"
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function styleForFeature(feature) {
    var p = feature.properties;
    if (feature.geometry.type === "LineString") {
      return {
        color: p.color || "#ffd54a",
        weight: Math.max(1.6, Math.min(p.width || 3, 5) * 0.9),
        opacity: 0.88,
        renderer: canvasRenderer
      };
    }
    return {};
  }

  function pointToLayer(feature, latlng) {
    var p = feature.properties;
    var color = CATEGORY_POINT_COLOR[p.category] || "#cccccc";
    var radius = p.category === "発電所" ? 5 : p.category === "変換所" ? 5 : 3.4;
    return L.circleMarker(latlng, {
      radius: radius,
      color: color,
      weight: 1,
      fillColor: color,
      fillOpacity: 0.85,
      renderer: canvasRenderer
    });
  }

  function buildLayer() {
    if (dataLayer) {
      map.removeLayer(dataLayer);
    }
    dataLayer = L.geoJSON(
      { type: "FeatureCollection", features: allFeatures.filter(function (f) { return featureMatchesFilters(f.properties); }) },
      {
        style: styleForFeature,
        pointToLayer: pointToLayer,
        onEachFeature: function (feature, layer) {
          layer.bindPopup(popupHtml(feature.properties), { closeButton: true });
        }
      }
    ).addTo(map);
  }

  function updateCounts() {
    var counts = { "送電線": 0, "変電所": 0, "発電所": 0, "変換所": 0 };
    allFeatures.forEach(function (f) {
      if (!state.company || normalizeCompany(f.properties.company) === state.company) {
        counts[f.properties.category] = (counts[f.properties.category] || 0) + 1;
      }
    });
    Object.keys(counts).forEach(function (cat) {
      var el = document.querySelector('[data-count="' + cat + '"]');
      if (el) el.textContent = counts[cat].toLocaleString();
    });
    document.getElementById("stat-total").textContent = allFeatures
      .filter(function (f) { return featureMatchesFilters(f.properties); })
      .length.toLocaleString();
  }

  function buildCompanyOptions() {
    var select = document.getElementById("company-filter");
    var names = Object.keys(companySet).sort(function (a, b) { return a.localeCompare(b, "ja"); });
    names.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  }

  function buildLegend() {
    var colorByVoltage = {};
    allFeatures.forEach(function (f) {
      var p = f.properties;
      if (p.category === "送電線" && p.group && VOLTAGE_ORDER.indexOf(p.group) !== -1) {
        colorByVoltage[p.group] = p.color;
      }
    });
    var ul = document.getElementById("voltage-legend");
    VOLTAGE_ORDER.forEach(function (v) {
      if (!colorByVoltage[v]) return;
      var li = document.createElement("li");
      var sw = document.createElement("span");
      sw.className = "legend-swatch";
      sw.style.background = colorByVoltage[v];
      var label = document.createElement("span");
      label.className = "kv";
      label.textContent = v;
      li.appendChild(sw);
      li.appendChild(label);
      ul.appendChild(li);
    });
  }

  function wireControls() {
    document.querySelectorAll('input[data-layer]').forEach(function (input) {
      input.addEventListener("change", function () {
        state.category[input.getAttribute("data-layer")] = input.checked;
        buildLayer();
        updateCounts();
      });
    });

    document.getElementById("company-filter").addEventListener("change", function (e) {
      state.company = e.target.value;
      buildLayer();
      updateCounts();
    });

    var sidebar = document.getElementById("sidebar");
    document.getElementById("sidebar-toggle").addEventListener("click", function () {
      var collapsed = sidebar.classList.toggle("collapsed");
      this.setAttribute("aria-expanded", String(!collapsed));
      setTimeout(function () { map.invalidateSize(); }, 180);
    });

    // Fill in the GitHub link from a data attribute set at deploy time, if present.
    var repoUrl = document.body.getAttribute("data-repo-url");
    if (repoUrl) {
      document.getElementById("github-btn").setAttribute("href", repoUrl);
    }
  }

  fetch("data/map_data.geojson")
    .then(function (res) { return res.json(); })
    .then(function (geojson) {
      allFeatures = geojson.features;
      allFeatures.forEach(function (f) {
        var c = normalizeCompany(f.properties.company);
        if (c) companySet[c] = true;
      });
      buildCompanyOptions();
      buildLegend();
      wireControls();
      buildLayer();
      updateCounts();
    })
    .catch(function (err) {
      console.error("Failed to load map data:", err);
      document.getElementById("map").innerHTML =
        '<p style="padding:40px;color:#e9eef3;font-family:sans-serif;">Could not load map_data.geojson. If you are viewing this file directly from disk, serve it over a local web server instead (see README).</p>';
    });
})();
