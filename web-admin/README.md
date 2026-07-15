# 爱摸鱼 APP 管理后台

这个后台负责品牌配置、GitHub Actions 云端打包触发、构建记录查看。Android 编译仍然全部交给 GitHub Actions。

已支持：

- 管理员登录
- 品牌配置编辑
- 图片资产上传
- `config.json / live.json / wall.json / update.json` 编辑
- 提交品牌配置、图片和 `tv/*.json` 到 GitHub
- 触发 GitHub Actions
- 查看构建记录和 GitHub workflow 状态

## 部署

1. 复制环境变量：

```bash
cp .env.example admin.env
```

2. 填写 `admin.env`：

```env
GITHUB_TOKEN=你的 Fine-grained token
GITHUB_OWNER=wangdacui003
GITHUB_REPO=my-video-app
GITHUB_BRANCH=fongmi
GITHUB_WORKFLOW_FILE=build-app.yml
SESSION_SECRET=一串随机长字符
ADMIN_PASSWORD_HASH=密码哈希
```

3. 生成密码哈希：

```bash
node -e "const crypto=require('crypto');const p=process.argv[1];const s=crypto.randomBytes(16).toString('hex');const h=crypto.scryptSync(p,s,64).toString('hex');console.log('scrypt$'+s+'$'+h)" '你的密码'
```

4. 启动：

```bash
docker compose up -d --build
```

默认访问：

```text
http://服务器IP:3000
```

如果要使用 `https://build.361123.xyz`，在 Nginx 或 Cloudflare Tunnel 里反代到 `127.0.0.1:3000`。

## GitHub Token 权限

Fine-grained token 建议只给 `wangdacui003/my-video-app` 仓库，并开启：

- Contents: Read and write
- Actions: Read and write

Token 只放后端 `admin.env`，不要写入前端或仓库。
