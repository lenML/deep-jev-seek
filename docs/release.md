# Release

## NPM

发布账号需属于 `@lenml` scope，并具备包发布权限。

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @lenml/jevseek publish --access public
```

发布前检查：

- `packages/jevseek/package.json` 版本已递增。
- 工作树干净。
- `pnpm-lock.yaml` 已提交。
- 远端 CI 通过。
- 生成包内容只包含 `dist`、README、LICENSE 和 package metadata。

本项目不自动发布 NPM 包。由维护者手动执行。

## Docker

`.github/workflows/docker.yml` 在 push tag 和手动触发时构建并推送：

```text
ghcr.io/lenml/deep-jev-seek:latest
ghcr.io/lenml/deep-jev-seek:<sha>
```

运行：

```bash
docker run --rm -p 8787:8787 \
  -e DEEPSEEK_API_KEY=sk-... \
  ghcr.io/lenml/deep-jev-seek:latest
```

## GitHub Pages

`.github/workflows/pages.yml` 构建 `apps/web`。仓库 Pages Source 需设为 `GitHub Actions`。
