# Play Store upload key reset

Use this when you need to **request an upload key reset** for the app in Google Play Console (e.g. lost key or rotating keys).

## 1. Have your upload keystore ready

- **Already generated**: If `android/app/upload-keystore.jks` exists (e.g. from running `generate-upload-keystore.ps1`), skip to step 2.
- **If you still have the key**: Copy `upload-keystore.jks` into `android/app/` (same folder as `debug.keystore`).
- **If you need a new key**: Run from project root:

  ```powershell
  cd appFrontend\android\app
  .\generate-upload-keystore.ps1
  ```

  Or with a password (non-interactive): `$env:UPLOAD_KEYSTORE_PASSWORD = "YourSecurePassword"; .\generate-upload-keystore.ps1`

  **Important:** If the keystore was created with the default temp password, change it before production:
  `keytool -storepasswd -keystore upload-keystore.jks` and `keytool -keypasswd -keystore upload-keystore.jks -alias upload`. Store passwords securely; you need them for release builds.

## 2. Export the certificate to PEM

From project root:

```powershell
cd appFrontend\android\app
keytool -export -rfc -keystore upload-keystore.jks -alias upload -file upload_certificate.pem
```

Or run the script (with the keystore already in `android/app/`):

```powershell
.\appFrontend\android\app\export-upload-cert.ps1
```

You’ll be prompted for the keystore password. This creates `upload_certificate.pem` in `android/app/`.

## 3. Request the reset in Play Console

1. Open [Google Play Console](https://play.google.com/console) and select the app.
2. Go to **Setup** → **App signing** (under “Release”).
3. Under **App signing key** or **Upload key**, choose **Request upload key reset** (or similar).
4. Follow the flow and **upload `upload_certificate.pem`** when asked.
5. After Google approves, use this keystore (and the same alias `upload`) for all release builds you upload to Play.

## 4. Use the upload key in release builds (optional)

To sign release builds with this keystore, add a `release` signing config in `android/app/build.gradle` that points to `upload-keystore.jks` and alias `upload`, and set `release { signingConfig = ... }` to use it. Keep passwords in environment variables or a secure store, not in the repo.

---

**Security:** Do not commit `upload-keystore.jks` or `upload_certificate.pem` to version control. Add them to `.gitignore` if they live under the project directory.
