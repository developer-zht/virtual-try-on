#!/usr/bin/env sh
# 把"当前分支"同时推送到所有远程仓库。
# 用 HEAD 而不是写死分支名，所以在任何分支上都通用，无需区分。
# 即使某个远程推送失败，也会继续尝试其余远程，最后统一汇报结果。

set -u

# 当前分支名（仅用于打印日志，推送本身用 HEAD 更稳）
branch="$(git rev-parse --abbrev-ref HEAD)"

# 想要同时推送的远程列表，按需增减
remotes="origin org"

failed=""
for remote in $remotes; do
  echo "==> 推送 $branch -> $remote"
  if git push "$remote" HEAD; then
    echo "    ✅ $remote 成功"
  else
    echo "    ❌ $remote 失败"
    failed="$failed $remote"
  fi
done

if [ -n "$failed" ]; then
  echo "以下远程推送失败：$failed" >&2
  exit 1
fi

echo "全部远程推送完成 🎉"
