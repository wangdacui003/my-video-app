# AiMoYu Branding

This directory is the single source of truth for AiMoYu app branding.

- `brand.json`: app names, package names, version, remote config URLs, and feature switches.
- `icon.png`: source app icon. Recommended size: 1024 x 1024 PNG.
- `logo.png`: home/logo asset placeholder.
- `splash.png`: splash asset placeholder.
- `wallpaper.jpg`: fallback wallpaper placeholder.
- `tv_banner.png`: Android TV launcher banner placeholder.

The GitHub Actions workflow runs `scripts/apply_brand.py` before building. The script validates `brand.json`, writes the app name for the selected flavor, and regenerates Android launcher icon assets from `branding/icon.png`.
