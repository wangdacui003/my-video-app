# 爱摸鱼 APK 打包说明

这个仓库已经接入品牌配置和云端打包：

- App 名称：爱摸鱼
- 手机版包名：xyz.a361123.aimoyu
- TV 版包名：xyz.a361123.aimoyu.tv
- 图标：来自 `branding/icon.png`
- 版本：默认读取 `branding/brand.json`，也可以在 GitHub Actions 里临时覆盖
- 默认点播配置：`https://361123.xyz/api/provide/config`

## 云端打包

打开 GitHub 仓库：

1. 进入 Actions
2. 选择 Build Aimoyu APK
3. 点击 Run workflow
4. 选择平台、CPU 架构和打包类型
5. 等待完成后，在 Artifacts 下载 aimoyu-apk

## 参数说明

- platform：`mobile` 是手机版，`leanback` 是电视版，`all` 是两个都打。
- architecture：`arm64`、`armv7` 或 `all`。
- build_type：`test` 使用临时测试签名；`release` 会优先使用 GitHub Secrets 里的正式签名。
- version_name：可选。留空时读取 `branding/brand.json`。
- version_code：可选。留空时读取 `branding/brand.json`。
- vod_url：可选。留空时读取 `branding/brand.json`。

## 品牌配置

品牌信息集中在：

```text
branding/brand.json
```

打包前 GitHub Actions 会运行：

```bash
python scripts/apply_brand.py --mode mobile
```

或：

```bash
python scripts/apply_brand.py --mode leanback
```

脚本会校验品牌配置、写入 APP 名称，并从 `branding/icon.png` 生成 Android 图标资源。
