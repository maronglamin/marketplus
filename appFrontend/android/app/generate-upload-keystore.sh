#!/usr/bin/env bash
# Generate upload-keystore.jks for Google Play upload signing (alias: upload).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE="$SCRIPT_DIR/upload-keystore.jks"
ALIAS="upload"

if [[ -f "$KEYSTORE" ]]; then
  echo "Keystore already exists: $KEYSTORE"
  echo "Delete it first if you intend to generate a new upload key."
  exit 1
fi

if [[ -z "${UPLOAD_KEYSTORE_PASSWORD:-}" ]]; then
  echo "Set UPLOAD_KEYSTORE_PASSWORD (store and key use the same password), e.g.:"
  echo "  export UPLOAD_KEYSTORE_PASSWORD='your-secure-password'"
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

"$JAVA_HOME/bin/keytool" -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$UPLOAD_KEYSTORE_PASSWORD" \
  -keypass "$UPLOAD_KEYSTORE_PASSWORD" \
  -dname "CN=SNAP Upload, OU=Mobile, O=Cloud Nexus, C=US"

echo "Created $KEYSTORE (alias: $ALIAS)"
echo "Next: ./export-upload-cert.sh  (then request upload key reset in Play Console)"
