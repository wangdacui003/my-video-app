# 爱摸鱼 APK 打包说明

这个仓库已经做了最小白牌定制：

- App 名称：爱摸鱼
- 包名：com.aimoyu.tv
- 图标：爱摸鱼定制图标
- 版本：通过 GitHub Actions 填写
- 默认点播配置：通过 GitHub Actions 填写

## 云端打包

打开 GitHub 仓库：

1. 进入 Actions
2. 选择 Build Aimoyu APK
3. 点击 Run workflow
4. 填写参数
5. 等待完成后，在 Artifacts 下载 aimoyu-apk

## 参数说明

- vod_url：FongMi 配置 JSON 地址，必须是 FongMi 能识别的 JSON 配置，不是普通网页首页。
- version_name：展示给用户看的版本，例如 1.0.0。
- version_code：安卓内部版本号，只能填数字。下次升级要比上一次大。
- variant：mobile 是手机版，leanback 是电视版，both 是两个都打。

默认填的 `https://361123.xyz/fongmi.json` 只是预留地址。如果服务器上还没有这个 JSON，需要先生成或上传对应配置。
