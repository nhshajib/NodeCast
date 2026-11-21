# Private Android signing: one-time owner setup

The 0.7.4 iPhone release is stable. The existing Android phone and TV APKs remain pre-release because they use the publicly known Android test key. Changing a GitHub flag does not fix their signature. Both Android editions must be rebuilt, checked and replaced before promotion.

The automation account can edit releases, but GitHub returns HTTP 403 for repository signing-secret/public-key access. An owner must perform the following setup. Never paste the keystore or passwords into chat, issues, source files or workflow inputs.

## Generate and back up the key (Windows PowerShell)

Install a JDK (for `keytool`) and GitHub CLI, then run these commands in a private directory outside the repository:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\GlowTV-signing"
Set-Location "$env:USERPROFILE\GlowTV-signing"
keytool -genkeypair -keystore glowtv-release.p12 -storetype PKCS12 -alias glowtv-release -keyalg RSA -keysize 3072 -validity 10000 -dname "CN=GlowTV Release, O=GlowTV"
```

Enter a long, unique password at the prompt. PKCS12 uses that password for both the store and key. Keep an encrypted offline backup of `glowtv-release.p12` and the password: losing either prevents normal updates. Use the same key for both editions and every future update. Do not generate a new key on each build.

## Configure four repository secrets and one public variable

Sign in to GitHub CLI as the repository owner (`gh auth login`). These commands upload the keystore without printing it:

```powershell
[IO.File]::WriteAllText("$PWD\glowtv-release.keystore.base64", [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\glowtv-release.p12")))
Get-Content -Raw glowtv-release.keystore.base64 | gh secret set GLOWTV_ANDROID_KEYSTORE_BASE64 --repo nhshajib/NodeCast
Remove-Item glowtv-release.keystore.base64
gh secret set GLOWTV_ANDROID_KEYSTORE_PASSWORD --repo nhshajib/NodeCast
gh secret set GLOWTV_ANDROID_KEY_PASSWORD --repo nhshajib/NodeCast
gh secret set GLOWTV_ANDROID_KEY_ALIAS --repo nhshajib/NodeCast --body glowtv-release
```

The two password commands prompt for input; enter the keystore password for each. If CLI access is unavailable, use repository **Settings → Secrets and variables → Actions → New repository secret**, with these exact names. The keystore secret contains base64, not the original binary.

Pin the public certificate fingerprint separately so a wrong or substituted keystore cannot silently change update identity:

```powershell
keytool -exportcert -keystore glowtv-release.p12 -alias glowtv-release -file glowtv-release.der
$glowtvCertificateSha = (Get-FileHash glowtv-release.der -Algorithm SHA256).Hash.ToLowerInvariant()
gh variable set GLOWTV_ANDROID_SIGNING_CERT_SHA256 --repo nhshajib/NodeCast --body $glowtvCertificateSha
```

Enter the password at keytool's prompt. This SHA-256 identifies the public certificate and is safe to share. Do not use the old test-key fingerprint (`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`). The workflow rejects it and debug certificates.

## Build, check and promote

1. Run **Build Android phone and TV APKs** on `main`, `target=both`, `create_draft=false`. Signing fails early if any secret or the certificate pin is missing. The APKs are signed with the private key before checksums or artifacts are produced.
2. Run **Test Android APK startup and TV remote** on `main`, with `target=both`, the new `build_run`, `tv_suite=design`, `api_level=35`, `make_public=false`. Require successful native design jobs for both editions, including playback and remote checks.
3. Run **Publish verified GlowTV Android downloads** on `main`. Supply the new build run ID, its full `source_sha`, and the native check run ID(s). Set `make_public=true`. The workflow validates checksums, manifests, exact native results and the owner-pinned private certificate before replacing the 0.7.4 pre-release files. It marks `glowtv-v0.7.4` stable and latest only after upload succeeds. It refuses to overwrite an already-stable release.
4. Rebuild the website and verify its release metadata, hashes, file sizes, counters and stable labels. Record the new certificate and artifact metadata in each edition's download records after successful publication; do not invent them in advance.

The alternative automatic publisher also compares the exact checked artifacts against attached APKs and requires the private certificate before changing release flags. The initial build job cannot clobber files on a published release before native checks.

## Existing Android installations

Before uninstalling the old test-signed APK, export an encrypted GlowTV backup and keep its password. Uninstall the testing edition once, install the new private-signed edition, then import the backup. Uninstalling without a backup removes local app data. Android rejects an in-place update with the new signing key; do not promise otherwise. iPhone installation/signing is unchanged.

## Verification and current limit

`python3 -m unittest discover -s apps/player/scripts -p test_android_release_signing.py` tests valid certificate pins and rejection of missing, changed, multi-signer, public-test and debug identities. These are signing-policy tests, not proof of a newly signed APK. No private keystore has been generated or stored by the automation account. A new Android build and native checks remain required after owner setup.
