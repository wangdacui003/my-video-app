#!/usr/bin/env python3
import argparse
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
BRAND_FILE = ROOT / "branding" / "brand.json"
RES_MAIN = ROOT / "app" / "src" / "main" / "res"
STRING_FILES = [
    RES_MAIN / "values" / "strings.xml",
    RES_MAIN / "values-zh-rCN" / "strings.xml",
    RES_MAIN / "values-zh-rTW" / "strings.xml",
]
ICON_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def fail(message):
    print(f"brand error: {message}", file=sys.stderr)
    sys.exit(1)


def read_brand():
    if not BRAND_FILE.exists():
        fail("branding/brand.json is missing")
    try:
        return json.loads(BRAND_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"branding/brand.json is invalid JSON: {exc}")


def require_string(data, key, max_len=None):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        fail(f"{key} must be a non-empty string")
    if max_len and len(value.strip()) > max_len:
        fail(f"{key} is too long; max length is {max_len}")
    return value.strip()


def require_bool(data, key):
    if not isinstance(data.get(key), bool):
        fail(f"{key} must be true or false")


def validate_package(value, key):
    if not re.fullmatch(r"[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+", value):
        fail(f"{key} is not a valid Android applicationId")


def validate_https(value, key):
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        fail(f"{key} must be an HTTPS URL")


def validate_brand(data, mode):
    require_string(data, "brandName", 20)
    require_string(data, "brandNameEnglish", 40)
    require_string(data, "mobileAppName", 20)
    require_string(data, "tvAppName", 20)
    validate_package(require_string(data, "mobileApplicationId"), "mobileApplicationId")
    validate_package(require_string(data, "tvApplicationId"), "tvApplicationId")
    if not isinstance(data.get("versionCode"), int) or data["versionCode"] <= 0:
        fail("versionCode must be a positive integer")
    require_string(data, "versionName", 40)
    for key in ["website", "vodConfig", "liveConfig", "wallConfig", "updateUrl", "apkDownloadBaseUrl"]:
        validate_https(require_string(data, key), key)
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", require_string(data, "themeColor")):
        fail("themeColor must look like #111318")
    for key in [
        "allowUserConfig",
        "buildMobile",
        "buildTv",
        "buildArm64",
        "buildArmV7",
        "enableUpdateCheck",
        "enableLive",
        "enableDLNA",
        "enableSpider",
    ]:
        require_bool(data, key)
    if mode == "mobile" and not data["buildMobile"]:
        fail("mode is mobile but buildMobile is false")
    if mode == "leanback" and not data["buildTv"]:
        fail("mode is leanback but buildTv is false")


def set_app_name(path, app_name):
    text = path.read_text(encoding="utf-8")
    replacement = f'<string name="app_name">{app_name}</string>'
    if re.search(r'<string\s+name="app_name">.*?</string>', text):
        text = re.sub(r'<string\s+name="app_name">.*?</string>', replacement, text, count=1)
    else:
        text = text.replace("<resources", f"<resources", 1)
        text = re.sub(r"(<resources[^>]*>\s*)", r"\1\n    " + replacement + "\n", text, count=1)
    path.write_text(text, encoding="utf-8", newline="")


def copy_optional_asset(name, target):
    source = ROOT / "branding" / name
    if source.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)


def generate_icons():
    source = ROOT / "branding" / "icon.png"
    if not source.exists():
        fail("branding/icon.png is missing")
    try:
        from PIL import Image
    except ImportError:
        fail("Pillow is required. Install with: python -m pip install pillow")
    with Image.open(source) as image:
        image = image.convert("RGBA")
        for density, size in ICON_SIZES.items():
            target_dir = RES_MAIN / density
            target_dir.mkdir(parents=True, exist_ok=True)
            resized = image.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(target_dir / "ic_launcher.png")
        nodpi = RES_MAIN / "drawable-nodpi"
        nodpi.mkdir(parents=True, exist_ok=True)
        image.resize((432, 432), Image.Resampling.LANCZOS).save(nodpi / "ic_launcher_aimoyu.png")
        image.resize((512, 512), Image.Resampling.LANCZOS).save(ROOT / "app" / "src" / "main" / "ic_launcher-playstore.png")
    anydpi = RES_MAIN / "mipmap-anydpi-v26"
    for name in ["ic_launcher.xml", "ic_launcher_round.xml"]:
        path = anydpi / name
        if path.exists():
            path.unlink()


def apply_brand(mode):
    data = read_brand()
    validate_brand(data, mode)
    app_name = data["tvAppName"] if mode == "leanback" else data["mobileAppName"]
    for path in STRING_FILES:
        if path.exists():
            set_app_name(path, app_name)
    generate_icons()
    copy_optional_asset("logo.png", RES_MAIN / "drawable-nodpi" / "brand_logo.png")
    copy_optional_asset("splash.png", RES_MAIN / "drawable-nodpi" / "brand_splash.png")
    copy_optional_asset("wallpaper.jpg", RES_MAIN / "drawable-nodpi" / "brand_wallpaper.jpg")
    copy_optional_asset("tv_banner.png", ROOT / "app" / "src" / "leanback" / "res" / "drawable" / "ic_banner.png")
    print(f"Applied {data['brandNameEnglish']} brand for {mode}: {app_name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["mobile", "leanback"], required=True)
    args = parser.parse_args()
    apply_brand(args.mode)


if __name__ == "__main__":
    main()
