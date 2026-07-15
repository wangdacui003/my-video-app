const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, "..");
const STORAGE = process.env.STORAGE_DIR || path.join(ROOT, "storage");
const PUBLIC_DIR = path.join(ROOT, "frontend");
const BRAND_PATH = path.join(STORAGE, "brand.json");
const BUILDS_PATH = path.join(STORAGE, "builds.json");
const JSON_DIR = path.join(STORAGE, "tv");
const JSON_FILES = new Set(["config", "live", "wall", "update"]);
const ASSET_DIR = path.join(STORAGE, "assets");
const ASSETS = {
  icon: { file: "icon.png", repo: "branding/icon.png", mime: "image/png", max: 3 * 1024 * 1024 },
  logo: { file: "logo.png", repo: "branding/logo.png", mime: "image/png", max: 3 * 1024 * 1024 },
  splash: { file: "splash.png", repo: "branding/splash.png", mime: "image/png", max: 6 * 1024 * 1024 },
  wallpaper: { file: "wallpaper.jpg", repo: "branding/wallpaper.jpg", mime: "image/jpeg", max: 6 * 1024 * 1024 },
  tv_banner: { file: "tv_banner.png", repo: "branding/tv_banner.png", mime: "image/png", max: 6 * 1024 * 1024 },
};
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || hashPassword(process.env.ADMIN_PASSWORD || "");
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "fongmi";
const GITHUB_WORKFLOW_FILE = process.env.GITHUB_WORKFLOW_FILE || "build-app.yml";

ensureStorage();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/tv/")) return routeApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    return json(res, error.status || 500, { error: error.message || "server_error" });
  }
});

server.listen(PORT, () => {
  console.log(`AiMoYu admin listening on :${PORT}`);
});

async function routeApi(req, res, url) {
  if (req.method === "GET" && url.pathname.startsWith("/tv/")) return publicTv(req, res, url);
  if (req.method === "POST" && url.pathname === "/api/login") return login(req, res);
  if (req.method === "POST" && url.pathname === "/api/logout") return logout(res);
  if (req.method === "GET" && url.pathname === "/api/session") return json(res, 200, { authenticated: isAuthenticated(req) });
  if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, health());
  if (!isAuthenticated(req)) return json(res, 401, { error: "unauthorized" });

  if (req.method === "GET" && url.pathname === "/api/brand") return json(res, 200, readJson(BRAND_PATH, defaultBrand()));
  if (req.method === "PUT" && url.pathname === "/api/brand") return saveBrand(req, res);
  if (req.method === "POST" && url.pathname === "/api/github/sync-brand") return syncBrandToGitHub(res);
  if (req.method === "POST" && url.pathname === "/api/github/sync-json") return syncJsonToGitHub(res);
  if (req.method === "POST" && url.pathname === "/api/github/sync-assets") return syncAssetsToGitHub(res);
  if (url.pathname.startsWith("/api/assets/")) return assetConfig(req, res, url);
  if (url.pathname.startsWith("/api/json/")) return jsonConfig(req, res, url);
  if (req.method === "POST" && url.pathname === "/api/builds") return triggerBuild(req, res);
  if (req.method === "GET" && url.pathname === "/api/builds") return json(res, 200, readJson(BUILDS_PATH, []));
  if (req.method === "GET" && url.pathname === "/api/github/runs") return listWorkflowRuns(res);
  if (req.method === "GET" && url.pathname === "/api/github/releases") return listReleases(res);
  return json(res, 404, { error: "not_found" });
}

async function login(req, res) {
  const body = await readBody(req);
  if (body.username !== ADMIN_USERNAME || !verifyPassword(body.password || "", ADMIN_PASSWORD_HASH)) {
    return json(res, 401, { error: "bad_credentials" });
  }
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = signSession(`${ADMIN_USERNAME}:${expires}`);
  res.setHeader("Set-Cookie", `aimoyu_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
  return json(res, 200, { ok: true });
}

function logout(res) {
  res.setHeader("Set-Cookie", "aimoyu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return json(res, 200, { ok: true });
}

async function saveBrand(req, res) {
  const brand = await readBody(req);
  validateBrand(brand);
  writeJson(BRAND_PATH, brand);
  return json(res, 200, { ok: true, brand });
}

async function jsonConfig(req, res, url) {
  const name = decodeURIComponent(url.pathname.replace("/api/json/", ""));
  if (!JSON_FILES.has(name)) return json(res, 404, { error: "unknown_json_file" });
  const file = path.join(JSON_DIR, `${name}.json`);
  if (req.method === "GET") return json(res, 200, readJson(file, defaultJsonConfig(name)));
  if (req.method === "PUT") {
    const value = await readBody(req);
    writeJson(file, value);
    return json(res, 200, { ok: true, value });
  }
  return json(res, 405, { error: "method_not_allowed" });
}

async function syncBrandToGitHub(res) {
  const brand = readJson(BRAND_PATH, defaultBrand());
  const result = await putGitHubFile("branding/brand.json", JSON.stringify(brand, null, 2) + "\n", "Update Aimoyu brand config");
  return json(res, 200, result);
}

async function syncJsonToGitHub(res) {
  const results = [];
  for (const name of JSON_FILES) {
    const file = path.join(JSON_DIR, `${name}.json`);
    const value = readJson(file, defaultJsonConfig(name));
    results.push(await putGitHubFile(`tv/${name}.json`, JSON.stringify(value, null, 2) + "\n", `Update ${name}.json`));
  }
  return json(res, 200, { ok: true, count: results.length });
}

async function assetConfig(req, res, url) {
  const name = decodeURIComponent(url.pathname.replace("/api/assets/", ""));
  const meta = ASSETS[name];
  if (!meta) return json(res, 404, { error: "unknown_asset" });
  const target = path.join(ASSET_DIR, meta.file);
  if (req.method === "GET") {
    return json(res, 200, {
      name,
      exists: fs.existsSync(target),
      fileName: meta.file,
      size: fs.existsSync(target) ? fs.statSync(target).size : 0,
    });
  }
  if (req.method === "PUT") {
    const body = await readBody(req);
    const buffer = decodeUpload(body, meta);
    fs.mkdirSync(ASSET_DIR, { recursive: true });
    fs.writeFileSync(target, buffer);
    return json(res, 200, { ok: true, name, fileName: meta.file, size: buffer.length });
  }
  return json(res, 405, { error: "method_not_allowed" });
}

async function syncAssetsToGitHub(res) {
  const results = [];
  for (const [name, meta] of Object.entries(ASSETS)) {
    const file = path.join(ASSET_DIR, meta.file);
    if (!fs.existsSync(file)) continue;
    results.push(await putGitHubFile(meta.repo, fs.readFileSync(file), `Update Aimoyu ${name} asset`));
  }
  return json(res, 200, { ok: true, count: results.length });
}

async function triggerBuild(req, res) {
  const body = await readBody(req);
  const inputs = {
    platform: body.platform || "mobile",
    architecture: body.architecture || "arm64",
    build_type: body.build_type || "test",
    version_name: body.version_name || "",
    version_code: body.version_code || "",
    vod_url: body.vod_url || "",
  };
  await github(`/actions/workflows/${GITHUB_WORKFLOW_FILE}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: GITHUB_BRANCH, inputs }),
  });
  const record = {
    id: crypto.randomUUID(),
    inputs,
    status: "queued",
    branch: GITHUB_BRANCH,
    workflow: GITHUB_WORKFLOW_FILE,
    createdAt: new Date().toISOString(),
  };
  const builds = readJson(BUILDS_PATH, []);
  builds.unshift(record);
  writeJson(BUILDS_PATH, builds.slice(0, 200));
  return json(res, 200, record);
}

async function listWorkflowRuns(res) {
  const result = await github(`/actions/workflows/${GITHUB_WORKFLOW_FILE}/runs?branch=${encodeURIComponent(GITHUB_BRANCH)}&per_page=20`);
  return json(res, 200, result);
}

async function listReleases(res) {
  const releases = await github("/releases?per_page=20");
  const items = releases.filter((release) => String(release.tag_name || "").startsWith("aimoyu-v")).map(releaseToManifest);
  return json(res, 200, { releases: items });
}

async function publicTv(req, res, url) {
  const matchJson = url.pathname.match(/^\/tv\/(config|live|wall|update)\.json$/);
  if (matchJson) {
    const name = matchJson[1];
    if (name === "update") return json(res, 200, await latestUpdateManifest());
    return json(res, 200, readJson(path.join(JSON_DIR, `${name}.json`), defaultJsonConfig(name)));
  }
  const matchAsset = url.pathname.match(/^\/tv\/assets\/([^/]+)$/);
  if (matchAsset) {
    const fileName = path.basename(matchAsset[1]);
    const file = path.join(ASSET_DIR, fileName);
    if (!fs.existsSync(file) || !file.startsWith(ASSET_DIR)) return text(res, 404, "Not found");
    return streamFile(res, file);
  }
  return text(res, 404, "Not found");
}

async function latestUpdateManifest() {
  try {
    const releases = await github("/releases?per_page=20");
    const release = releases.find((item) => String(item.tag_name || "").startsWith("aimoyu-v"));
    if (release) return releaseToManifest(release);
  } catch (error) {
    console.error(error);
  }
  return readJson(path.join(JSON_DIR, "update.json"), defaultJsonConfig("update"));
}

function releaseToManifest(release) {
  const tag = String(release.tag_name || "");
  const versionCode = Number(tag.match(/-(\d+)$/)?.[1] || 0);
  const versionName = tag.replace(/^aimoyu-v/, "").replace(/-\d+$/, "") || release.name || "";
  const manifest = {
    code: versionCode,
    name: versionName,
    desc: release.body || "爱摸鱼影视 APP 新版本。",
    versionCode,
    versionName,
    force: false,
    description: release.body || "爱摸鱼影视 APP 新版本。",
    publishedAt: release.published_at || release.created_at || "",
    htmlUrl: release.html_url,
    mobile: {},
    tv: {},
  };
  for (const asset of release.assets || []) {
    if (!String(asset.name || "").endsWith(".apk")) continue;
    const target = asset.name.includes("-tv-") ? "tv" : "mobile";
    const arch = asset.name.includes("-arm64-") ? "arm64" : "armv7";
    manifest[target][arch] = {
      name: asset.name,
      url: asset.browser_download_url,
      size: asset.size,
      downloadCount: asset.download_count,
    };
    if (!manifest.url && target === "mobile" && arch === "arm64") manifest.url = asset.browser_download_url;
  }
  return manifest;
}

async function putGitHubFile(repoPath, content, message) {
  const current = await github(`/contents/${repoPath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { allow404: true });
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  const body = {
    message,
    branch: GITHUB_BRANCH,
    content: buffer.toString("base64"),
  };
  if (current && current.sha) body.sha = current.sha;
  return github(`/contents/${repoPath}`, { method: "PUT", body: JSON.stringify(body) });
}

async function github(apiPath, options = {}) {
  const owner = requiredEnv("GITHUB_OWNER");
  const repo = requiredEnv("GITHUB_REPO");
  const token = requiredEnv("GITHUB_TOKEN");
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${apiPath}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body,
  });
  if (options.allow404 && response.status === 404) return null;
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.message || `GitHub API failed: ${response.status}`);
  return data;
}

function validateBrand(brand) {
  const required = ["brandName", "mobileAppName", "tvAppName", "mobileApplicationId", "tvApplicationId", "versionName", "website", "vodConfig"];
  for (const key of required) if (!String(brand[key] || "").trim()) throw new HttpError(400, `${key} is required`);
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(brand.mobileApplicationId)) throw new HttpError(400, "mobileApplicationId is invalid");
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(brand.tvApplicationId)) throw new HttpError(400, "tvApplicationId is invalid");
  if (!Number.isInteger(Number(brand.versionCode)) || Number(brand.versionCode) <= 0) throw new HttpError(400, "versionCode must be positive");
  for (const key of ["website", "vodConfig", "liveConfig", "wallConfig", "updateUrl", "apkDownloadBaseUrl"]) {
    if (brand[key] && !String(brand[key]).startsWith("https://")) throw new HttpError(400, `${key} must be HTTPS`);
  }
}

function serveStatic(req, res, url) {
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestPath));
  if (!filePath.startsWith(PUBLIC_DIR)) return text(res, 403, "Forbidden");
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return text(res, 404, "Not found");
  const ext = path.extname(filePath).toLowerCase();
  const type = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml" }[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(filePath).pipe(res);
}

function streamFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  const type = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".json": "application/json; charset=utf-8" }[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "public, max-age=300" });
  fs.createReadStream(file).pipe(res);
}

function isAuthenticated(req) {
  const cookie = req.headers.cookie || "";
  const token = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith("aimoyu_session="))?.split("=")[1];
  if (!token) return false;
  const raw = verifySession(token);
  if (!raw) return false;
  const [username, expires] = raw.split(":");
  return username === ADMIN_USERNAME && Number(expires) > Date.now();
}

function signSession(raw) {
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(raw).digest("base64url");
  return `${Buffer.from(raw).toString("base64url")}.${sig}`;
}

function verifySession(token) {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const raw = Buffer.from(payload, "base64url").toString();
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(raw).digest("base64url");
  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? raw : null;
}

function hashPassword(password) {
  if (!password) return "";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").includes("$") ? String(stored || "").split("$") : String(stored || "").split(":");
  const [, salt, hash] = parts;
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(hash));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

function ensureStorage() {
  fs.mkdirSync(STORAGE, { recursive: true });
  fs.mkdirSync(JSON_DIR, { recursive: true });
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  if (!fs.existsSync(BRAND_PATH)) writeJson(BRAND_PATH, defaultBrand());
  if (!fs.existsSync(BUILDS_PATH)) writeJson(BUILDS_PATH, []);
  for (const name of JSON_FILES) {
    const file = path.join(JSON_DIR, `${name}.json`);
    if (!fs.existsSync(file)) writeJson(file, defaultJsonConfig(name));
  }
}

function decodeUpload(body, meta) {
  const dataUrl = String(body.data || "");
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new HttpError(400, "upload must be a data URL");
  const mime = match[1];
  if (mime !== meta.mime) throw new HttpError(400, `file must be ${meta.mime}`);
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > meta.max) throw new HttpError(400, "file size is invalid");
  if (meta.mime === "image/png" && !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) throw new HttpError(400, "invalid PNG");
  if (meta.mime === "image/jpeg" && !(buffer[0] === 0xff && buffer[1] === 0xd8)) throw new HttpError(400, "invalid JPEG");
  return buffer;
}

function health() {
  return {
    ok: true,
    githubConfigured: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO),
    passwordConfigured: Boolean(ADMIN_PASSWORD_HASH),
  };
}

function defaultBrand() {
  return {
    brandName: "爱摸鱼",
    brandNameEnglish: "AiMoYu",
    mobileAppName: "爱摸鱼",
    tvAppName: "爱摸鱼 TV",
    mobileApplicationId: "xyz.a361123.aimoyu",
    tvApplicationId: "xyz.a361123.aimoyu.tv",
    versionCode: 1,
    versionName: "1.0.0",
    website: "https://361123.xyz",
    vodConfig: "https://361123.xyz/api/provide/config",
    liveConfig: "https://361123.xyz/tv/live.json",
    wallConfig: "https://361123.xyz/tv/wall.json",
    updateUrl: "https://361123.xyz/tv/update.json",
    apkDownloadBaseUrl: "https://361123.xyz/tv/apk/",
    themeColor: "#111318",
    allowUserConfig: true,
    buildMobile: true,
    buildTv: true,
    buildArm64: true,
    buildArmV7: false,
    enableUpdateCheck: true,
    enableLive: true,
    enableDLNA: true,
    enableSpider: true,
  };
}

function defaultJsonConfig(name) {
  if (name === "config") {
    return {
      logo: "https://361123.xyz/tv/assets/logo.png",
      wallpaper: "https://361123.xyz/tv/assets/wallpaper.jpg",
      sites: [],
      parses: [],
      lives: [],
      flags: [],
      ads: [],
    };
  }
  if (name === "update") {
    return {
      versionCode: 1,
      versionName: "1.0.0",
      force: false,
      description: "爱摸鱼影视 APP 首个版本。",
      publishedAt: "",
      mobile: {},
      tv: {},
    };
  }
  if (name === "live") return { lives: [] };
  if (name === "wall") return { wallpapers: [] };
  return {};
}

function requiredEnv(key) {
  if (!process.env[key]) throw new HttpError(500, `${key} is not configured`);
  return process.env[key];
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function text(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
