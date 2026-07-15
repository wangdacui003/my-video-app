const fields = [
  ["brandName", "品牌中文名"],
  ["brandNameEnglish", "品牌英文名"],
  ["mobileAppName", "手机版名称"],
  ["tvAppName", "TV 版名称"],
  ["mobileApplicationId", "手机版包名"],
  ["tvApplicationId", "TV 版包名"],
  ["versionName", "版本名称"],
  ["versionCode", "版本号"],
  ["website", "官网地址"],
  ["vodConfig", "默认 VOD 配置"],
  ["liveConfig", "直播配置"],
  ["wallConfig", "壁纸配置"],
  ["updateUrl", "更新 JSON"],
  ["apkDownloadBaseUrl", "APK 下载目录"],
  ["themeColor", "主题色"],
];

const boolFields = [
  ["allowUserConfig", "允许用户修改接口"],
  ["buildMobile", "允许打手机版"],
  ["buildTv", "允许打 TV 版"],
  ["buildArm64", "允许 ARM64"],
  ["buildArmV7", "允许 ARMv7"],
  ["enableUpdateCheck", "启用更新检查"],
  ["enableLive", "启用直播"],
  ["enableDLNA", "启用 DLNA"],
  ["enableSpider", "启用 Spider"],
];

let currentBrand = {};

boot();

async function boot() {
  bindEvents();
  const session = await api("/api/session");
  if (session.authenticated) showDashboard();
}

function bindEvents() {
  qs("#loginBtn").onclick = login;
  qs("#logoutBtn").onclick = logout;
  qs("#saveBrandBtn").onclick = saveBrand;
  qs("#syncBrandBtn").onclick = syncBrand;
  qs("#buildBtn").onclick = triggerBuild;
  qs("#refreshRunsBtn").onclick = loadRuns;
  qs("#loadJsonBtn").onclick = loadJsonConfig;
  qs("#saveJsonBtn").onclick = saveJsonConfig;
  qs("#jsonName").onchange = loadJsonConfig;
}

async function login() {
  try {
    await api("/api/login", {
      method: "POST",
      body: {
        username: qs("#username").value,
        password: qs("#password").value,
      },
    });
    showDashboard();
  } catch (error) {
    qs("#loginMsg").textContent = "登录失败，请检查账号密码。";
  }
}

async function logout() {
  await api("/api/logout", { method: "POST" });
  location.reload();
}

async function showDashboard() {
  qs("#login").classList.add("hidden");
  qs("#dashboard").classList.remove("hidden");
  await Promise.all([loadBrand(), loadBuilds(), loadHealth(), loadJsonConfig()]);
}

async function loadBrand() {
  currentBrand = await api("/api/brand");
  const form = qs("#brandForm");
  form.innerHTML = "";
  for (const [key, label] of fields) {
    form.appendChild(inputField(key, label, currentBrand[key] ?? ""));
  }
  for (const [key, label] of boolFields) {
    form.appendChild(checkField(key, label, Boolean(currentBrand[key])));
  }
}

function inputField(key, label, value) {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const input = document.createElement("input");
  input.dataset.key = key;
  input.value = value;
  wrapper.appendChild(input);
  return wrapper;
}

function checkField(key, label, value) {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const select = document.createElement("select");
  select.dataset.key = key;
  select.innerHTML = `<option value="true">是</option><option value="false">否</option>`;
  select.value = String(value);
  wrapper.appendChild(select);
  return wrapper;
}

async function saveBrand() {
  const brand = { ...currentBrand };
  document.querySelectorAll("[data-key]").forEach((element) => {
    const key = element.dataset.key;
    if (boolFields.some(([item]) => item === key)) brand[key] = element.value === "true";
    else if (key === "versionCode") brand[key] = Number(element.value);
    else brand[key] = element.value;
  });
  try {
    const result = await api("/api/brand", { method: "PUT", body: brand });
    currentBrand = result.brand;
    qs("#brandMsg").textContent = "已保存到后台。";
  } catch (error) {
    qs("#brandMsg").textContent = `保存失败：${error.message}`;
  }
}

async function syncBrand() {
  try {
    await syncSaveFirst();
    await api("/api/github/sync-brand", { method: "POST" });
    qs("#brandMsg").textContent = "已提交 brand.json 到 GitHub。";
  } catch (error) {
    qs("#brandMsg").textContent = `提交失败：${error.message}`;
  }
}

async function syncSaveFirst() {
  await saveBrand();
}

async function triggerBuild() {
  try {
    const body = {
      platform: qs("#platform").value,
      architecture: qs("#architecture").value,
      build_type: qs("#buildType").value,
    };
    await api("/api/builds", { method: "POST", body });
    qs("#buildMsg").textContent = "已触发 GitHub Actions。";
    await loadBuilds();
  } catch (error) {
    qs("#buildMsg").textContent = `触发失败：${error.message}`;
  }
}

async function loadBuilds() {
  const builds = await api("/api/builds");
  qs("#builds").innerHTML = builds.map((item) => `
    <div class="item">
      <strong>${item.inputs.platform} / ${item.inputs.architecture} / ${item.inputs.build_type}</strong>
      <div>${item.status} · ${item.createdAt}</div>
    </div>
  `).join("") || "暂无记录";
}

async function loadRuns() {
  try {
    const data = await api("/api/github/runs");
    qs("#builds").innerHTML = data.workflow_runs.map((run) => `
      <div class="item">
        <strong>${run.display_title || run.name}</strong>
        <div>${run.status} / ${run.conclusion || "-"} · ${run.created_at}</div>
        <a href="${run.html_url}" target="_blank" rel="noreferrer">打开 GitHub</a>
      </div>
    `).join("");
  } catch (error) {
    qs("#builds").innerHTML = `<div class="item">读取失败：${error.message}</div>`;
  }
}

async function loadHealth() {
  qs("#health").textContent = JSON.stringify(await api("/api/health"), null, 2);
}

async function loadJsonConfig() {
  const name = qs("#jsonName").value;
  const value = await api(`/api/json/${name}`);
  qs("#jsonEditor").value = JSON.stringify(value, null, 2);
  qs("#jsonMsg").textContent = `已读取 ${name}.json`;
}

async function saveJsonConfig() {
  const name = qs("#jsonName").value;
  try {
    const value = JSON.parse(qs("#jsonEditor").value);
    await api(`/api/json/${name}`, { method: "PUT", body: value });
    qs("#jsonMsg").textContent = `已保存 ${name}.json`;
  } catch (error) {
    qs("#jsonMsg").textContent = `保存失败：${error.message}`;
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "request_failed");
  return data;
}

function qs(selector) {
  return document.querySelector(selector);
}
