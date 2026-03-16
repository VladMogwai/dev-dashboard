#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh 1.0.1"
  exit 1
fi

echo "🚀 Releasing v$VERSION..."

# 1. Update version in package.json
npm version $VERSION --no-git-tag-version

# 2. Build
echo "📦 Building..."
npm run dist

# 3. Get hashes
ARM64_FILE="dist/Dev Dashboard-$VERSION-arm64-mac.zip"
X64_FILE="dist/Dev Dashboard-$VERSION-mac.zip"

ARM64_HASH=$(shasum -a 256 "$ARM64_FILE" | awk '{print $1}')
X64_HASH=$(shasum -a 256 "$X64_FILE" | awk '{print $1}')

echo "✅ arm64: $ARM64_HASH"
echo "✅ x64:   $X64_HASH"

# 4. Git tag and push
git add package.json
git commit -m "Release v$VERSION"
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"

# 5. Update Homebrew tap
TAP_DIR="../homebrew-dev-dashboard"

cat > "$TAP_DIR/Casks/dev-dashboard.rb" << EOF
cask "dev-dashboard" do
  version "$VERSION"

  if Hardware::CPU.arm?
    sha256 "$ARM64_HASH"
    url "https://github.com/VladMogwai/dev-dashboard/releases/download/v$VERSION/Dev.Dashboard-$VERSION-arm64-mac.zip"
  else
    sha256 "$X64_HASH"
    url "https://github.com/VladMogwai/dev-dashboard/releases/download/v$VERSION/Dev.Dashboard-$VERSION-mac.zip"
  end

  name "Dev Dashboard"
  desc "Developer Project Dashboard — like Docker Desktop for local dev projects"
  homepage "https://github.com/VladMogwai/dev-dashboard"

  app "Dev Dashboard.app"

  uninstall quit: "com.devdashboard.app",
            delete: "/Applications/Dev Dashboard.app"

  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/Dev Dashboard.app"],
                   sudo: false
  end
end
EOF

cd "$TAP_DIR"
git add .
git commit -m "Release v$VERSION"
git push

echo ""
echo "✅ Done! Now go to GitHub and create the release:"
echo "👉 https://github.com/VladMogwai/dev-dashboard/releases/new?tag=v$VERSION"
echo ""
echo "Attach these files:"
echo "   dist/Dev Dashboard-$VERSION-arm64-mac.zip"
echo "   dist/Dev Dashboard-$VERSION-mac.zip"
