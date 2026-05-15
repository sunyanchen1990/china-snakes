#!/usr/bin/env node
/**
 * Download snake images from pictureknow CDN to local assets,
 * then rewrite data/snakes.raw.json and data/snakes.data.js.
 *
 * Usage: node scripts/download-images.mjs
 * Options:
 *   --dry-run   List URLs only, no download
 *   --force     Re-download even if file exists
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_PATH = path.join(ROOT, "data", "snakes.raw.json");
const DATA_JS_PATH = path.join(ROOT, "data", "snakes.data.js");
const IMG_ROOT = path.join(ROOT, "assets", "images", "species");

const CONCURRENCY = 8;
const MAX_RETRIES = 3;
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function extFromUrl(url) {
  try {
    const p = new URL(url).pathname;
    const m = p.match(/\.(jpe?g|png|gif|webp)$/i);
    return m ? m[0].toLowerCase() : ".png";
  } catch {
    return ".png";
  }
}

function toDataJs(obj) {
  return "window.CN_VIPER_DATA = " + JSON.stringify(obj, null, 4) + ";\n";
}

async function fetchWithRetry(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CN-Snake-Archive/1.0 (local mirror)" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error("HTTP " + res.status + " for " + url);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 64) {
    throw new Error("Response too small (" + buf.length + " bytes)");
  }
  return buf;
}

async function downloadTo(url, dest) {
  if (!force && fs.existsSync(dest)) {
    return { dest, skipped: true };
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let lastErr;
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      const buf = await fetchWithRetry(url, i);
      fs.writeFileSync(dest, buf);
      return { dest, skipped: false };
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 400 * i));
    }
  }
  throw lastErr;
}

async function runPool(tasks, limit) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function collectJobs(data) {
  const jobs = [];
  const snakes = data.snakes || [];

  for (const snake of snakes) {
    const id = snake.id;
    if (!id) continue;
    const dir = path.join(IMG_ROOT, id);
    const rel = (name) => "assets/images/species/" + id + "/" + name;

    if (snake.cover && /^https?:\/\//i.test(snake.cover)) {
      const ext = extFromUrl(snake.cover);
      const file = "cover" + ext;
      jobs.push({
        snake,
        field: "cover",
        url: snake.cover,
        abs: path.join(dir, file),
        rel: rel(file),
      });
    }

    if (snake.disImg && /^https?:\/\//i.test(snake.disImg)) {
      const ext = extFromUrl(snake.disImg);
      const file = "dis" + ext;
      jobs.push({
        snake,
        field: "disImg",
        url: snake.disImg,
        abs: path.join(dir, file),
        rel: rel(file),
      });
    }

    if (Array.isArray(snake.images)) {
      snake.images.forEach((item, i) => {
        if (!item || !item.img || !/^https?:\/\//i.test(item.img)) return;
        const ext = extFromUrl(item.img);
        const file = String(i + 1) + ext;
        jobs.push({
          snake,
          field: "images",
          index: i,
          url: item.img,
          abs: path.join(dir, file),
          rel: rel(file),
        });
      });
    }
  }

  return jobs;
}

async function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.error("Missing", RAW_PATH);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
  const jobs = collectJobs(data);

  console.log("Species:", data.snakes.length);
  console.log("Images to mirror:", jobs.length);
  if (dryRun) {
    jobs.slice(0, 5).forEach((j) => console.log(" ", j.url, "->", j.rel));
    console.log("...");
    return;
  }

  let done = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  const tasks = jobs.map((job) => async () => {
    try {
      const res = await downloadTo(job.url, job.abs);
      if (res.skipped) skipped++;
      else done++;
      if (job.field === "cover") job.snake.cover = job.rel;
      else if (job.field === "disImg") job.snake.disImg = job.rel;
      else if (job.field === "images") job.snake.images[job.index].img = job.rel;
      const n = done + skipped + failed;
      if (n % 25 === 0 || n === jobs.length) {
        process.stdout.write(
          "\rProgress " + n + "/" + jobs.length + " (new " + done + ", skip " + skipped + ", fail " + failed + ")"
        );
      }
    } catch (err) {
      failed++;
      failures.push({ url: job.url, rel: job.rel, err: String(err.message || err) });
    }
  });

  await runPool(tasks, CONCURRENCY);
  console.log("");

  if (failed) {
    console.error("Failed downloads:", failed);
    failures.slice(0, 10).forEach((f) => console.error(" -", f.rel, f.err));
    if (failures.length > 10) console.error(" ... and", failures.length - 10, "more");
  }

  data.meta = data.meta || {};
  data.meta.imagesLocal = true;
  data.meta.imagesMirroredAt = new Date().toISOString().slice(0, 10);

  fs.writeFileSync(RAW_PATH, JSON.stringify(data, null, 2) + "\n");
  fs.writeFileSync(DATA_JS_PATH, toDataJs(data));

  console.log("Updated:", RAW_PATH);
  console.log("Updated:", DATA_JS_PATH);
  console.log("Done. New:", done, "Skipped:", skipped, "Failed:", failed);

  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
