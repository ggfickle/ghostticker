#!/usr/bin/env bash
set -euo pipefail

GHOSTTICKER_REPO="${GHOSTTICKER_REPO:-ggfickle/ghostticker}"
GHOSTTICKER_VERSION="${GHOSTTICKER_VERSION:-latest}"
GHOSTTICKER_ASSET_URL="${GHOSTTICKER_ASSET_URL:-}"
GHOSTTICKER_INSTALL_DIR="${GHOSTTICKER_INSTALL_DIR:-$HOME/.local/share/ghostticker}"
GHOSTTICKER_BIN_DIR="${GHOSTTICKER_BIN_DIR:-$HOME/.local/bin}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ghostticker installer: missing required command: $1" >&2
    exit 1
  fi
}

require_command curl
require_command node
require_command npm
require_command tar

node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$node_major" -lt 22 ]; then
  echo "ghostticker installer: Node.js 22 or newer is required." >&2
  exit 1
fi

if [ "$GHOSTTICKER_VERSION" = "latest" ]; then
  tag="$(
    curl -fsSL "https://api.github.com/repos/${GHOSTTICKER_REPO}/releases/latest" \
      | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' \
      | head -n 1
  )"
else
  tag="$GHOSTTICKER_VERSION"
fi

if [ -z "${tag:-}" ]; then
  echo "ghostticker installer: could not resolve release tag." >&2
  exit 1
fi

asset="ghostticker-${tag}.tar.gz"
url="${GHOSTTICKER_ASSET_URL:-https://github.com/${GHOSTTICKER_REPO}/releases/download/${tag}/${asset}}"
tmp_dir="$(mktemp -d)"
archive="${tmp_dir}/${asset}"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

echo "Installing ghostticker ${tag} from ${GHOSTTICKER_REPO}"
curl -fsSL "$url" -o "$archive"
tar -xzf "$archive" -C "$tmp_dir"

rm -rf "$GHOSTTICKER_INSTALL_DIR"
mkdir -p "$(dirname "$GHOSTTICKER_INSTALL_DIR")" "$GHOSTTICKER_BIN_DIR"
mv "${tmp_dir}/ghostticker" "$GHOSTTICKER_INSTALL_DIR"

(
  cd "$GHOSTTICKER_INSTALL_DIR"
  npm ci --omit=dev --fund=false --audit=false
)

entrypoint="$(printf "%s" "${GHOSTTICKER_INSTALL_DIR}/dist/cli.js" | sed "s/'/'\\\\''/g")"
cat > "${GHOSTTICKER_BIN_DIR}/ghostticker" <<EOF
#!/usr/bin/env sh
exec node '${entrypoint}' "\$@"
EOF
chmod +x "${GHOSTTICKER_BIN_DIR}/ghostticker"

echo "ghostticker installed to ${GHOSTTICKER_INSTALL_DIR}"
echo "Run: ghostticker"
if ! command -v ghostticker >/dev/null 2>&1; then
  echo "If ghostticker is not found, add ${GHOSTTICKER_BIN_DIR} to PATH." >&2
fi
