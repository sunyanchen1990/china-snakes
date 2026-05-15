#!/usr/bin/env node
/**
 * Browser E2E tests via Playwright.
 * Requires: local server on BASE (default 9321)
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = process.env.PORT || "9322";
const BASE = `http://127.0.0.1:${PORT}`;
const failures = [];
const warnings = [];

function fail(msg) {
  failures.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-m", "http.server", PORT], {
      cwd: ROOT,
      stdio: "ignore",
    });
    proc.on("error", reject);
    setTimeout(() => resolve(proc), 800);
  });
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console: " + msg.text());
  });

  try {
    // Home stats
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
    const species = await page.textContent("#home-n-species");
    if (species !== "152") fail("home species count expected 152 got " + species);
    const deadly = await page.textContent("#home-n-deadly");
    if (deadly !== "47") fail("home deadly count expected 47 got " + deadly);

    // Browse filter
    await page.goto(BASE + "/browse.html", { waitUntil: "networkidle" });
    await page.fill("#f-province", "广东省");
    await page.fill("#f-keyword", "竹叶青");
    await page.click('button[type="submit"]');
    await page.waitForSelector("[data-snake-card]");
    const cards = await page.$$("[data-snake-card]");
    if (cards.length < 1) fail("browse filter returned 0 cards for 广东+竹叶青");
    const firstLink = await page.getAttribute(".card__link", "href");
    if (!firstLink || !firstLink.startsWith("species.html?id="))
      fail("card link missing: " + firstLink);
    const cardText = await page.textContent("[data-snake-card]");
    if (cardText.includes("急救措施")) fail("browse card still shows 急救措施");

    // Species detail
    await page.goto(BASE + "/" + firstLink, { waitUntil: "networkidle" });
    await page.waitForSelector(".species-card h1");
    const h1 = await page.textContent(".species-card h1");
    if (!h1 || !h1.includes("竹叶青")) fail("species page h1 wrong: " + h1);
    const aid = await page.textContent(".species-body");
    if (!aid || !aid.includes("急救措施")) fail("species page missing 急救措施");

    // Species not found
    await page.goto(BASE + "/species.html?id=snake-999", { waitUntil: "networkidle" });
    const nf = await page.textContent("#species-root");
    if (!nf.includes("未找到")) fail("bad species id should show not found");

    // Species redirect from browse
    await page.goto(BASE + "/browse.html?species=snake-001", { waitUntil: "networkidle" });
    if (!page.url().includes("species.html?id=snake-001"))
      fail("browse?species redirect failed: " + page.url());
    const yhs = await page.textContent(".species-card h1");
    if (!yhs.includes("银环蛇")) fail("redirect species name wrong: " + yhs);

    // First aid
    await page.goto(BASE + "/first-aid.html", { waitUntil: "networkidle" });
    await page.waitForSelector("#aid-deadly-grid a");
    const deadlyLinks = await page.$$("#aid-deadly-grid a");
    if (deadlyLinks.length !== 47) fail("first-aid deadly grid count " + deadlyLinks.length);
    await page.click('[data-aid-tab="mild"]');
    const mildPanel = page.locator('[data-aid-panel="mild"]');
    if (await mildPanel.isHidden()) fail("mild tab panel not shown");
    const tel = await page.getAttribute(".aid-call", "href");
    if (tel !== "tel:120") fail("aid call href wrong");

    // Dist map loads on species
    await page.goto(BASE + "/species.html?id=snake-001", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const chartMounted = await page.getAttribute("[data-dist-chart]", "data-dist-mounted");
    if (chartMounted !== "1") warn("dist map may not have mounted on species page");

    // Service worker registers
    const swOk = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "no-sw-api";
      try {
        const reg = await navigator.serviceWorker.register("sw.js");
        return reg ? "ok" : "fail";
      } catch (e) {
        return "err:" + e.message;
      }
    });
    if (!String(swOk).startsWith("ok")) warn("service worker: " + swOk);

    // Donate modal
    await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
    await page.click("#donate-trigger");
    const modalHidden = await page.getAttribute("#donate-modal", "hidden");
    if (modalHidden !== null) fail("donate modal should be visible after click");

    if (errors.length) {
      errors.forEach((e) => warn(e));
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.log("E2E on", BASE);
  console.log("Failures:", failures.length);
  failures.forEach((f) => console.log("  FAIL:", f));
  console.log("Warnings:", warnings.length);
  warnings.forEach((w) => console.log("  WARN:", w));
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
