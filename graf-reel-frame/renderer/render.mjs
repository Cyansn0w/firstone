// =====================================================================
//  Graf Reel-Frame Renderer
//  node render.mjs <spec.json> [--prores] [--nur <name>] [--vorschau]
//
//  Rendert jedes Modul aus spec.json als transparente .mov (QuickTime
//  Animation, Alpha) in 1080x1920 / 25 fps. In Premiere einfach auf eine
//  Spur ueber das Video legen. --prores erzeugt ProRes 4444 statt Animation.
// =====================================================================
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const specPath = args.find(a => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--nur");
if (!specPath) { console.log("Aufruf: node render.mjs <spec.json> [--prores] [--nur <name>] [--vorschau]"); process.exit(1); }
const only = args.includes("--nur") ? args[args.indexOf("--nur") + 1] : null;
const prores = args.includes("--prores");
const preview = args.includes("--vorschau");

const specDir = path.dirname(path.resolve(specPath));
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const brand = { ...JSON.parse(fs.readFileSync(path.join(here, "brand.json"), "utf8")), ...(spec.brand || {}) };
const FPS = spec.fps || 25;
const outDir = path.resolve(specDir, spec.ausgabe || "export");
fs.mkdirSync(outDir, { recursive: true });

const fileUrl = p => pathToFileURL(path.resolve(specDir, p)).href;
const isAsset = s => typeof s === "string" && /\.(png|svg|jpe?g|webp|otf|ttf|woff2?)$/i.test(s);
// lokale Pfade in file://-URLs umwandeln
function resolveAssets(o) {
  if (Array.isArray(o)) return o.map(resolveAssets);
  if (o && typeof o === "object") { const r = {}; for (const k in o) r[k] = resolveAssets(o[k]); return r; }
  return isAsset(o) && !/^(https?|file):/.test(o) ? fileUrl(o) : o;
}
brand.fontFiles = (brand.fontFiles || []).map(f => ({ ...f, src: fileUrl(f.src) }));

// ---------- SRT -> Caption-Chunks (1-2 Woerter, Zeit nach Zeichen) ----------
function tc(s) { const m = s.match(/(\d+):(\d+):(\d+)[,.](\d+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 10 ** m[4].length; }
function srtChunks(file, offset = 0) {
  const raw = fs.readFileSync(path.resolve(specDir, file), "utf8").replace(/^﻿/, "").replace(/\r/g, "");
  const chunks = [];
  for (const block of raw.split(/\n\s*\n/)) {
    const lines = block.split("\n"), tl = lines.findIndex(l => l.includes("-->"));
    if (tl < 0) continue;
    const [a, b] = lines[tl].split("-->").map(tc);
    const words = lines.slice(tl + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const groups = []; let cur = [];
    for (const w of words) {
      const marked = /[*#]/.test(w);
      const test = [...cur, w].join(" ").replace(/[*#]/g, "");
      if (cur.length && (marked || cur.length >= brand.capMaxWords || test.length > brand.capMaxChars)) { groups.push(cur.join(" ")); cur = []; }
      cur.push(w);
      if (marked) { groups.push(cur.join(" ")); cur = []; }
    }
    if (cur.length) groups.push(cur.join(" "));
    const total = groups.reduce((s, g) => s + g.length + 2, 0);
    let t0 = a + offset;
    for (const g of groups) {
      const d = (b - a) * (g.length + 2) / total;
      chunks.push({ a: t0, b: t0 + d, t: g.replace(/[*#]/g, ""), style: /\*/.test(g) ? "serif" : /#/.test(g) ? "accent" : "normal" });
      t0 += d;
    }
  }
  // Luecken < 0,25 s schliessen, damit Captions nicht flackern
  for (let i = 0; i < chunks.length - 1; i++) if (chunks[i + 1].a - chunks[i].b < .25) chunks[i].b = chunks[i + 1].a;
  return chunks;
}

// Bewegte Flaechen (Fotos, Verlaeufe) sind als ProRes 4444 viel kleiner,
// fast statische Grafik als QuickTime Animation. Beide mit Alpha, beide liest Premiere nativ.
const PRORES_MODULES = new Set(["karussell", "lupe", "transition"]);
function encoder(out, module) {
  const codec = (prores || PRORES_MODULES.has(module))
    ? ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-alpha_bits", "16", "-qscale:v", "6"]
    : ["-c:v", "qtrle", "-pix_fmt", "argb"];
  const p = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...codec, out], { stdio: ["pipe", "inherit", "inherit"] });
  return p;
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "stage.html")).href);

for (const raw of spec.module) {
  if (only && raw.name !== only) continue;
  const job = resolveAssets(raw);
  if (job.module === "captions") {
    job.chunks = job.srt ? srtChunks(raw.srt, job.offset || 0) : job.chunks;
    job.duration = job.duration || Math.ceil(job.chunks.at(-1).b + .5);
  }
  const dur = job.duration || 4, frames = Math.round(dur * FPS);
  const out = path.join(outDir, `${raw.name}.mov`);
  await page.evaluate(([j, b]) => window.setup(j, b), [job, brand]);
  if (preview) {
    await page.evaluate(t => window.frame(t), job.previewAt ?? Math.min(dur - .1, 1.5));
    await page.screenshot({ path: path.join(outDir, `${raw.name}.png`), omitBackground: true });
    console.log("Vorschau", raw.name);
    continue;
  }
  const enc = encoder(out, job.module);
  let lastKey = "", lastBuf = null;
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const key = await page.evaluate(t => window.frame(t), f / FPS);
    let buf = key && key === lastKey ? lastBuf : await page.screenshot({ omitBackground: true, type: "png" });
    lastKey = key; lastBuf = buf;
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once("drain", r));
  }
  enc.stdin.end();
  await new Promise(r => enc.on("close", r));
  console.log(`${raw.name}.mov  ${dur}s  (${((Date.now() - t0) / 1000).toFixed(0)}s Renderzeit)`);
}
await browser.close();
