#!/usr/bin/env bash
# ============================================================
# clean-ios-build.sh
# Local clean-build routine for all 4 cliniq.one Capacitor iOS apps.
# Run from the repo root on macOS (or in Codemagic remote session).
# ============================================================
set -euo pipefail

# ---- Configuration ----------------------------------------
APPS=(doctor-capacitor admin-capacitor patient-capacitor locum-capacitor)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# -----------------------------------------------------------

echo "=== cliniq.one iOS Clean Build ==="
echo "Repo root: $REPO_ROOT"
cd "$REPO_ROOT"

# ── Step 1: Clean JS ──────────────────────────────────────
echo ""
echo "▶ [1/4] Cleaning and reinstalling JS dependencies..."
rm -rf node_modules
npm ci --legacy-peer-deps

# ── Step 2: Create placeholders for server.url apps ───────
echo ""
echo "▶ [2/4] Creating www placeholders for server.url apps..."
for app in doctor-capacitor admin-capacitor locum-capacitor; do
  mkdir -p "apps/$app/www"
  echo '<html><body>Loading...</body></html>' > "apps/$app/www/index.html"
  echo "  ✓ apps/$app/www/index.html"
done

# patient-capacitor uses ../patient/dist as webDir
mkdir -p "apps/patient/dist"
echo '<html><body>Loading...</body></html>' > "apps/patient/dist/index.html"
echo "  ✓ apps/patient/dist/index.html"

# ── Step 3: Cap add + sync + pod install for each app ─────
echo ""
echo "▶ [3/4] Syncing Capacitor iOS and installing Pods..."
for app in "${APPS[@]}"; do
  echo ""
  echo "  ── $app ──"

  cd "$REPO_ROOT/apps/$app"

  # Remove stale iOS if present
  if [ -d "ios" ]; then
    echo "  Removing stale ios/ directory..."
    rm -rf ios
  fi

  # Add iOS platform
  npx cap add ios

  # Sync plugins and config into native project
  npx cap sync ios

  # Clean and reinstall Pods
  echo "  Installing CocoaPods..."
  cd ios/App
  rm -rf Pods Podfile.lock
  pod repo update
  pod install

  cd "$REPO_ROOT"
done

# ── Step 4: Validate ──────────────────────────────────────
echo ""
echo "▶ [4/4] Validating native project structure..."
for app in "${APPS[@]}"; do
  WS="apps/$app/ios/App/App.xcworkspace"
  PODFILE="apps/$app/ios/App/Podfile"
  if [ -d "$WS" ] && [ -f "$PODFILE" ]; then
    echo "  ✅ $app — xcworkspace + Podfile present"
  else
    echo "  ❌ $app — MISSING: $([ -d "$WS" ] || echo 'xcworkspace ')$([ -f "$PODFILE" ] || echo 'Podfile')"
  fi
done

echo ""
echo "=== Clean build prep complete! ==="
echo "Next: open Xcode, select the .xcworkspace, and archive for distribution."
echo "Or push to main to trigger Codemagic."
