# GitHub

本仓库可直接公开到 GitHub。建议步骤：

```bash
cd Vid2Know
git init
git add .
git commit -m "feat: initial Vid2Know (影知) release"
gh repo create vid2know --public --source=. --remote=origin --push
```

不要提交：

- `.env`
- `config/providers.yaml`（含真实 Key）
- `config/cookies.txt`
- `data/notes`、`data/cache`、`data/uploads` 内容

上述已写入 `.gitignore`。
