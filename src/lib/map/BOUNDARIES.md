# Boundary assets

Copied from the app repo (`oqupa/assets/boundaries/README.md`); the website serves the same
`distritos_piura.geojson` from `public/boundaries/`. Keep the two copies identical.

| File | What | Source | Licence |
|---|---|---|---|
| `departamento_piura.geojson` | The outer border of the departamento de Piura (location-picker validation, map border layer) | GADM 4.1 (gadm.org), University of California, Davis | GADM licence (see the file's `copyright`) |
| `distritos_piura.geojson` | The 65 official districts of the departamento de Piura — which district a listing's pin is in (map plan step 1, ADR-031) | Instituto Geográfico Nacional (IGN), Perú — "Peru - Subnational Administrative Boundaries" (COD-AB) via OCHA HDX, https://data.humdata.org/dataset/cod-ab-per, `per_admin3`, valid_on 2020-07-14, dataset updated 2026-01-26. Downloaded 2026-10-24 | CC BY-IGO 3.0 — attribution required: "Límites distritales: Instituto Geográfico Nacional (IGN), Perú, vía OCHA HDX." |

`distritos_piura.geojson` processing: only departamento Piura kept; each outline simplified
(Ramer–Douglas–Peucker, tolerance 0.0003° ≈ 33 m) and rounded to 5 decimals; properties reduced to
`distrito`, `provincia`, `departamento`, `ubigeo`. Measured: 1 of 3,000 random points around the Piura
metro area lands in a different district than with the full-detail outlines; none lands outside every
district. File size ≈ 302 KB. The IGN source spells "Tambo Grande" and "Veintiseis de Octubre" — the
app maps them to the official names in `peru_geography.dart` (tests pin this).

Do not hand-edit the outlines. To refresh: download the HDX GeoJSON, keep `adm1_name == "Piura"`,
simplify with the same tolerance, and re-run `test/services/infrastructure/map/district_resolver_test.dart`.
