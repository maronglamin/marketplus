# Play Store upload key reset

Use this when you need to **request an upload key reset** in Google Play Console (e.g. new dev machine, lost key).

## 1. Generate upload keystore (new machine)

From `appFrontend/android/app`:

```bash
export UPLOAD_KEYSTORE_PASSWORD='your-secure-password'
./generate-upload-keystore.sh
```

If `upload-keystore.jks` already exists, delete it only when you intend to create a **new** key (you will need a Play upload key reset again).

Scripts pick up Java from `JAVA_HOME`, Android Studio JBR, or Homebrew OpenJDK 17.

## 2. Export certificate (PEM)

```bash
export UPLOAD_KEYSTORE_PASSWORD='your-secure-password'   # same as step 1
./export-upload-cert.sh
```

Creates `upload_certificate.pem` in `android/app/`.

## 3. Request reset in Play Console

Google no longer always shows **Request upload key reset** on the App signing page. As account owner, use the **help form** (official path):

1. Open [Play Console Help & support](https://play.google.com/console/developers/help-and-support) (left menu: **Help** → **Contact support**, or the ? icon).
2. Choose **Publishing** / **App signing** (wording varies) → topic about **lost or compromised upload key** / **upload key reset**.
3. Select app **SNAP** (`biz.cloudnexus.snap.app`).
4. When asked, upload `android/app/upload_certificate.pem`.
5. Wait for Google’s email (often 24–48 hours). After approval, use this keystore for all uploads.

**Where to view keys (not where you reset):**

- Left menu: **Test and release** (or **Release**) → **App integrity** → **App signing**  
  or: **Protected with Play** → **Play Store distribution** → **Go to Play app signing**
- You should see **App signing key** (Google holds) and **Upload key certificate** (your uploads). There may be no reset button here — that is normal.

**If you don’t see App signing at all:** the app may not be enrolled in Play App Signing yet, or you need permission **Release to production, exclude devices, and use Play App Signing**.

## 4. Release signing for local `bundleRelease`

Copy the example and set passwords (file is gitignored):

```bash
cp android/keystore.properties.example android/keystore.properties
# edit MYAPP_UPLOAD_* passwords
```

`gradle.properties` already points at `upload-keystore.jks` and alias `upload`. Passwords can also come from env:

```bash
export MYAPP_UPLOAD_STORE_PASSWORD='...'
export MYAPP_UPLOAD_KEY_PASSWORD='...'
```

## 5. Install NDK (required before bundle build)

Install **NDK 26.1.10909125** via Android Studio: **Settings → Android SDK → SDK Tools → NDK (Side by side)**.  
Command-line `sdkmanager` installs were interrupted on this machine; use Studio if the NDK folder only contains `.installer`.

## 6. Build release AAB

```bash
cd appFrontend/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export NODE_ENV=production
./gradlew clean :app:bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

Or from `appFrontend`: `npm run android:bundle`

---

**Security:** Do not commit `upload-keystore.jks`, `upload_certificate.pem`, or `keystore.properties`. They are covered by `.gitignore` / `*.jks` / `*.pem`.
