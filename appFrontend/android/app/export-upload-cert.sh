#!/usr/bin/env bash
# Export upload certificate PEM for Play Console upload key reset.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE="$SCRIPT_DIR/upload-keystore.jks"
ALIAS="upload"
OUT="$SCRIPT_DIR/upload_certificate.pem"

if [[ ! -f "$KEYSTORE" ]]; then
  echo "Missing keystore: $KEYSTORE"
  echo "Run ./generate-upload-keystore.sh first."
  exit 1
fi

JAVA_HOME="${JAVA_HOME:-}"
if [[ -z "$JAVA_HOME" || ! -x "$JAVA_HOME/bin/keytool" ]]; then
  for candidate in \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    "/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home"; do
    if [[ -x "$candidate/bin/keytool" ]]; then
      JAVA_HOME="$candidate"
      break
    fi
  done
fi
if [[ -z "$JAVA_HOME" || ! -x "$JAVA_HOME/bin/keytool" ]]; then
  echo "Could not find keytool. Install JDK 17+ or set JAVA_HOME."
  exit 1
fi

if [[ -n "${UPLOAD_KEYSTORE_PASSWORD:-}" ]]; then
  "$JAVA_HOME/bin/keytool" -export -rfc \
    -keystore "$KEYSTORE" -alias "$ALIAS" -file "$OUT" \
    -storepass "$UPLOAD_KEYSTORE_PASSWORD"
else
  "$JAVA_HOME/bin/keytool" -export -rfc \
    -keystore "$KEYSTORE" -alias "$ALIAS" -file "$OUT"
fi

echo "Wrote $OUT — upload this file in Play Console (Setup → App signing → Request upload key reset)."
