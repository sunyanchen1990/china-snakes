#!/usr/bin/env node
/** HTTP integration tests against local server. */
const BASE = process.env.BASE || "http://127.0.0.1:8877";

const failures = [];
const warnings = [];

function fail(m) { failures.push(m); }
function warn(m) { warnings.push(m); }

async function get(path) {
  const res = await fetch(BASE + path);
  const text = await res.text();
  return { status: res.status, text, ok: res.ok };
}

async function main() {
  try {
    await fetch(BASE + "/");
  } catch (e) {
    console.error("Cannot reach server at", BASE);
    console.error("Start with: python3 -m http.server 8877");
    process.exit(2);
  }

  const pages = [
    ["/index.html", ["home-n-species", "first-aid.html", "sw-register.js"]],
    ["/browse.html", ["f-search", "vendor/echarts", "browse-app.js"]],
    ["/species.html?id=snake-001", ["species-root", "species-app.js", "银环蛇"]],
    ["/species.html?id=bad-id", ["未找到该物种"]],
    ["/first-aid.html", ["aid-deadly-grid", "拨打 120", "first-aid-app.js"]],
    ["/browse.html?species=snake-002", ["browse-app.js"]], // redirect is client-side
  ];

  for (const [path, needles] of pages) {
    const r = await get(path);
    if (!r.ok) fail("HTTP " + r.status + " " + path);
    for (const n of needles) {
      if (!r.text.includes(n)) fail(path + " missing: " + n);
    }
  }

  const assets = [
    "/data/snakes.data.js",
    "/assets/vendor/echarts.min.js",
    "/assets/data/china.geo.json",
    "/assets/images/species/snake-001/cover.png",
    "/sw.js",
    "/manifest.json",
    "/assets/icons/icon-192.png",
  ];
  for (const a of assets) {
    const r = await get(a);
    if (!r.ok) fail("asset " + r.status + " " + a);
  }

  const missing = [
    "/image/zhuyeqing-hero.jpg",
    "/assets/images/donate-qrcode.jpg",
  ];
  for (const a of missing) {
    const r = await get(a);
    if (r.status === 404) warn("optional asset 404: " + a);
  }

  // data.js should be valid assign
  const dataRes = await get("/data/snakes.data.js");
  if (!dataRes.text.includes("window.CN_VIPER_DATA")) fail("snakes.data.js invalid");
  if (dataRes.text.includes("static.pictureknow.com")) fail("snakes.data.js still has CDN urls");

  console.log("HTTP tests on", BASE);
  console.log("Failures:", failures.length);
  failures.forEach((f) => console.log("  FAIL:", f));
  console.log("Warnings:", warnings.length);
  warnings.forEach((w) => console.log("  WARN:", w));
  process.exit(failures.length ? 1 : 0);
}

main();
