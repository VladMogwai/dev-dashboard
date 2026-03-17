#!/bin/bash
set -e

print_banner() {
  local code=$1
  local version=$2
  echo ""
  if [ "$code" -eq 0 ]; then
    printf "\033[1;32m"
    printf "╔══════════════════════════════════════════════════════╗\n"
    printf "║                                                      ║\n"
    printf "║   ✅   RELEASE v%-6s COMPLETED SUCCESSFULLY   ✅   ║\n" "$version"
    printf "║                                                      ║\n"
    printf "╚══════════════════════════════════════════════════════╝\n"
    printf "\033[0m"
  else
    printf "\033[1;31m"
    printf "╔══════════════════════════════════════════════════════╗\n"
    printf "║                                                      ║\n"
    printf "║   ❌         RELEASE FAILED WITH ERROR          ❌   ║\n"
    printf "║                                                      ║\n"
    printf "╚══════════════════════════════════════════════════════╝\n"
    printf "\033[0m"
  fi
  echo ""
}

trap 'print_banner $? "$VERSION"' EXIT

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh 1.0.1"
  exit 1
fi

echo "🚀 Full release v$VERSION (arm64 + x64)..."

npm version $VERSION --no-git-tag-version --allow-same-version

echo "📦 Building arm64 + x64..."
vite build
npx electron-builder --mac --x64 --publish never
npx electron-builder --mac --arm64 --publish never

ARM64_FILE="dist/Polvoo-$VERSION-arm64-mac.zip"
X64_FILE="dist/Polvoo-$VERSION-mac.zip"

ARM64_HASH=$(shasum -a 256 "$ARM64_FILE" | awk '{print $1}')
X64_HASH=$(shasum -a 256 "$X64_FILE" | awk '{print $1}')

echo "✅ arm64: $ARM64_HASH"
echo "✅ x64:   $X64_HASH"

git add package.json
git commit -m "Release v$VERSION"
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"

echo "📤 Uploading to GitHub Release..."
gh release create "v$VERSION" \
  "$ARM64_FILE" \
  "$X64_FILE" \
  "dist/latest-mac.yml" \
  --title "Polvoo $VERSION" \
  --notes "Release v$VERSION"

echo "✅ GitHub Release created and files uploaded!"

TAP_DIR="../homebrew-polvoo"

cat > "$TAP_DIR/Casks/polvoo.rb" << EOF
cask "polvoo" do
  version "$VERSION"

  if Hardware::CPU.arm?
    sha256 "$ARM64_HASH"
    url "https://github.com/VladMogwai/polvoo/releases/download/v$VERSION/Polvoo-$VERSION-arm64-mac.zip"
  else
    sha256 "$X64_HASH"
    url "https://github.com/VladMogwai/polvoo/releases/download/v$VERSION/Polvoo-$VERSION-mac.zip"
  end

  name "Polvoo"
  desc "Developer Project Dashboard — like Docker Desktop for local dev projects"
  homepage "https://github.com/VladMogwai/polvoo"

  app "Polvoo.app"

  uninstall quit: "com.polvoo.app",
            delete: "/Applications/Polvoo.app"

  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/Polvoo.app"],
                   sudo: false
  end
end
EOF

cd "$TAP_DIR"
git add .
git commit -m "Release v$VERSION"
git push

echo ""
echo "✅ Full release v$VERSION is live!"
echo "👉 https://github.com/VladMogwai/polvoo/releases/tag/v$VERSION"
