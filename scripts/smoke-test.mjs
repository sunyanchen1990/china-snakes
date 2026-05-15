#!/usr/bin/env node
/**
 * Static functional tests (no browser required).
 * Run: node scripts/smoke-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];
const warnings = [];

function fail(msg) {
  failures.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function loadData() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, "data/snakes.data.js"), "utf8"),
    ctx
  );
  return ctx.window.CN_VIPER_DATA;
}

function loadUtils(data) {
  const ctx = { window: { CN_VIPER_DATA: data } };
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, "assets/snake-utils.js"), "utf8"),
    ctx
  );
  return ctx.window.SnakeUtils;
}

// --- data integrity ---
const data = loadData();
const snakes = data.snakes || [];
if (snakes.length !== 152) fail("expected 152 species, got " + snakes.length);

const idSet = new Set();
for (const s of snakes) {
  if (idSet.has(s.id)) fail("duplicate id: " + s.id);
  idSet.add(s.id);
  if (!s.cnName) fail("missing cnName: " + s.id);
  for (const field of ["cover", "disImg"]) {
    const p = s[field];
    if (p && /^https?:/i.test(p)) fail("external image: " + s.id + " " + field);
    if (p && !fs.existsSync(path.join(ROOT, p))) fail("missing file: " + p);
  }
  for (const im of s.images || []) {
    if (im.img && /^https?:/i.test(im.img))
      fail("external image in gallery: " + s.id);
    if (im.img && !fs.existsSync(path.join(ROOT, im.img)))
      fail("missing gallery file: " + im.img);
  }
}

// --- SnakeUtils ---
const U = loadUtils(data);
if (!U.findSnakeById("snake-001")) fail("findSnakeById snake-001 failed");
if (U.findSnakeById("snake-999")) fail("findSnakeById should return null for bad id");
if (U.speciesUrl("snake-001") !== "species.html?id=snake-001")
  fail("speciesUrl wrong");

// --- HTML pages ---
const pages = ["index.html", "browse.html", "species.html", "first-aid.html"];
for (const p of pages) {
  const html = fs.readFileSync(path.join(ROOT, p), "utf8");
  if (/<motion/i.test(html)) fail(p + " contains invalid <motion> tag");
  if (!html.includes("first-aid.html")) warn(p + " missing nav link to first-aid");
  if (!html.includes("sw-register.js") && p !== "species.html")
    {} // species has it
  if (!html.includes("manifest.json")) warn(p + " missing manifest link");
}

if (!fs.readFileSync(path.join(ROOT, "browse.html"), "utf8").includes("vendor/echarts"))
  fail("browse.html still uses CDN echarts");

// --- browse-app: no firstAid in list ---
const browseJs = fs.readFileSync(path.join(ROOT, "assets/browse-app.js"), "utf8");
if (browseJs.includes("firstAid")) fail("browse-app still references firstAid");
if (browseJs.includes("secList")) fail("browse-app still has secList");
if (!browseJs.includes("species.html?id=")) fail("browse-app missing species links");
if (!browseJs.includes('get("species")')) fail("browse-app missing species redirect");

// --- province filter simulation ---
function stripProvinceSuffix(name) {
  var s = String(name || "").trim().replace(/\s/g, "");
  var pats = [
    "维吾尔自治区",
    "壮族自治区",
    "回族自治区",
    "特别行政区",
    "自治区",
    "省",
    "市",
  ];
  for (var i = 0; i < pats.length; i++) {
    var p = pats[i];
    if (s.length >= p.length && s.slice(-p.length) === p)
      return s.slice(0, -p.length);
  }
  return s;
}
function provinceHit(a, b) {
  a = stripProvinceSuffix(a);
  b = stripProvinceSuffix(b);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true;
  return false;
}
function snakeInProvince(snake, userInput) {
  var arr = snake.provinces;
  if (!Array.isArray(arr)) return false;
  return arr.some((p) => provinceHit(userInput, p));
}
const gd = snakes.filter((s) => snakeInProvince(s, "广东省"));
if (gd.length < 5) fail("Guangdong filter too few results: " + gd.length);

function keywordMatch(snake, rawKw) {
  var kw = String(rawKw || "").trim();
  if (!kw) return true;
  var name = snake.cnName || "";
  var parts = kw.split(/\s+/).filter(Boolean);
  return parts.every((p) => name.indexOf(p) !== -1);
}
const yhs = snakes.filter((s) => keywordMatch(s, "竹叶青"));
if (yhs.length < 2) fail("keyword 竹叶青 too few: " + yhs.length);

// --- sw shell files exist ---
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const shellMatch = sw.match(/var SHELL = \[([\s\S]*?)\];/);
if (shellMatch) {
  const paths = [...shellMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const rel of paths) {
    const clean = rel.replace(/^\.\//, "");
    if (clean === "./" || clean === "") continue;
    const abs = path.join(ROOT, clean);
    if (!fs.existsSync(abs)) fail("sw.js shell missing: " + rel);
  }
}

// --- background image ref ---
const css = fs.readFileSync(path.join(ROOT, "assets/site.css"), "utf8");
const bgMatch = css.match(/url\("([^"]+)"\)/);
if (bgMatch) {
  const bgPath = path.join(ROOT, "assets", bgMatch[1].replace(/^\.\.\//, ""));
  if (!fs.existsSync(bgPath))
    warn("hero background image missing: " + bgMatch[1]);
}

console.log("Species:", snakes.length);
console.log("Guangdong filter:", gd.length);
console.log("Keyword 竹叶青:", yhs.length);
console.log("Failures:", failures.length);
failures.forEach((f) => console.log("  FAIL:", f));
console.log("Warnings:", warnings.length);
warnings.forEach((w) => console.log("  WARN:", w));
process.exit(failures.length ? 1 : 0);
