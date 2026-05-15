#!/usr/bin/env node
/** Fetch ECharts + China GeoJSON for offline use. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const VENDORS = [
  {
    url: "https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js",
    dest: "assets/vendor/echarts.min.js",
  },
  {
    url: "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
    dest: "assets/data/china.geo.json",
  },
];

async function download(url, dest) {
  const abs = path.join(ROOT, dest);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(abs, dest.endsWith(".json") ? JSON.stringify(JSON.parse(buf.toString()), null, 0) : buf);
  console.log("OK", dest, "(" + buf.length + " bytes)");
}

for (const v of VENDORS) {
  await download(v.url, v.dest);
}
