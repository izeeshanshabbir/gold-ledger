# Gold Ledger project context

Technical reference for later work on this repository. Statements here are taken from the source tree, local release artifacts, or the public Play listing and website as fetched on 11 November 2026. Where a fact was not established, it says so.

## Identity

- Product: Gold Ledger: Trading Sim
- Launcher label: Gold Ledger (`android/app/src/main/res/values/strings.xml`)
- Android application id / namespace: `com.goldtokenapp`
- Android `versionCode`: 2
- Android `versionName`: 1.0
- JS package version in `package.json`: `0.0.1` (not the Play version)
- Profile drawer label: `v1.0.0` (`ProfileDrawer.tsx`)
- minSdk 24, targetSdk 36, compileSdk 36
- Play URL: https://play.google.com/store/apps/details?id=com.goldtokenapp
- Website: https://goldledger-lilac.vercel.app
- In-app URLs (`src/config/links.ts`): `{WEB_BASE}/privacy.html`, `{WEB_BASE}/delete-account.html`, support email `ahsannisar446@gmail.com`
- Firebase client project id: `goldtokenapp` (from `google-services.json` / `GoogleService-Info.plist`)
- Publisher named on the website and privacy policy: Ahsan Rao, Pakistan
- Play listing developer name observed on the public page: ahsanrao
- Release engineering and this repository: Muhammad, GitHub account `izeeshanshabbir`

The original application was inherited. Muhammad's release work is account deletion, legal pages and in-app links, upload signing outside the repo, store assets and listing copy, Play requirements that depend on those, and personal end-to-end testing before publication. Do not describe him as the original author of the trading app.

## What the product does

It is a virtual gold-token simulator.

- Signup creates a Firebase Auth user and `users/{uid}` with `cashBalance: 10000` and `tokenBalance: 0`.
- Login uses `signInWithEmailAndPassword` and stores uid, email, and Auth `displayName`. It does not read Firestore.
- Dashboard loads the wallet, starts the price loop (10 second local ticks, 60 second Firestore sync), subscribes to the user document, and loads a day-change base price.
- Buy spends virtual cash for tokens at `currentGoldPrice`. Sell does the reverse. Each is two writes: wallet, then transaction.
- Transfer looks up the recipient by email twice, then updates both token balances and writes both transaction documents in one Firestore transaction.
- Emergency top-up adds 10,000 virtual cash through a Firestore transaction. No cooldown is implemented.
- History shows the latest 50 transactions.
- Charts use up to 72 `market/gold/history` points. The portfolio chart computes `cashBalance + tokenBalance * historicalPrice` with the **current** balances.
- Account deletion is the flow in the next section.

There is no deposit, withdrawal, card payment, or external market-data provider in this repository.

## Account deletion

File: `src/store/slices/authSlice.ts`, thunk `deleteAccount`. UI: `src/components/ProfileDrawer.tsx`.

Order:

1. Require `currentUser` and `currentUser.email`.
2. `reauthenticateWithCredential` with the password from the modal.
3. Delete `users/{uid}/transactions` in batches of at most 400.
4. Delete `users/{uid}`.
5. `currentUser.delete()`.
6. UI calls `persistor.purge()` only after the thunk fulfills.

Wrong-password and `auth/invalid-credential` surface as "That password is incorrect. Your account has not been deleted."

Not deleted:

- The other party's transfer document (`senderId`, `receiverId`, and `receiverEmail` on the sender's copy only).
- `market/gold` and `market/gold/history`.
- Firestore data is not restored if step 5 fails after steps 3 and 4 succeed. No compensating job exists in this repo.

The public page also offers a manual email request for users who cannot sign in. That is support text, not an Admin SDK call.

Firestore security rules are not in the repo. Client deletes succeed only if those rules allow the signed-in user to delete their documents. Rules were not inspected here.

## Architecture

```text
App.tsx
  Provider + PersistGate + SafeAreaProvider
  AppContent dispatches initializeWallet and checkAuthState
  NavigationContainer > AppNavigator

AppNavigator
  unauthenticated: Login, Signup
  authenticated: tabs Home | Market | Portfolio | Activity
  Home stack: Dashboard, Buy, Sell, Transfer

Redux
  authSlice     Firebase Auth thunks, including deleteAccount
  walletSlice   balances, price, buy, sell, transfer, emergency funds, history fetch
  transactionSlice  present; HistoryScreen does not use it
  persist whitelist: auth, wallet, transactions

Services
  priceService   local generation + market/gold sync
  walletService  wallet CRUD, transferTokensAtomic, history, emergency funds
```

`@react-navigation/drawer` is a dependency and is not used to build the profile UI.

Price generation (`priceService.generateNextPrice`):

- reference and default price 65.5
- fluctuation `(Math.random() - 0.5) * 0.018`
- upward drift `0.0009`
- mean reversion `((reference - price) / reference) * 0.06`
- clamp to [50, 100]

A comment in `priceService.ts` claims a large reduction in Firebase calls. That comment is not a measurement. Do not repeat it as a result.

## Android

- Gradle wrapper 8.14.3
- `android/build.gradle`: build-tools 36.0.0, Kotlin 2.1.20, NDK 27.1.12297006, google-services plugin 4.4.4
- `gradle.properties`: `newArchEnabled=true`, `hermesEnabled=true`, `edgeToEdgeEnabled=false`, ABIs `armeabi-v7a,arm64-v8a,x86,x86_64`
- Manifest: `INTERNET` only, `allowBackup=false`, `enableOnBackInvokedCallback=false`
- Release signing properties, values only on the build machine: `GOLD_LEDGER_UPLOAD_STORE_FILE`, `GOLD_LEDGER_UPLOAD_STORE_PASSWORD`, `GOLD_LEDGER_UPLOAD_KEY_ALIAS`, `GOLD_LEDGER_UPLOAD_KEY_PASSWORD`
- Debug signing: `android/app/debug.keystore`, alias `androiddebugkey`, standard debug passwords. Not the Play upload key.
- `android/local.properties` is gitignored (`sdk.dir` only).

iOS `PRODUCT_BUNDLE_IDENTIFIER` is still `org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)`. `GoogleService-Info.plist` says `BUNDLE_ID` `com.goldtokenapp`. iOS was not the shipped platform.

## Firebase client config

`android/app/google-services.json` and `ios/GoogleService-Info.plist` are mobile client configs: project id, project number, app id, and a client API key. They contain no `private_key` and no service-account email. They ship inside the app binary. They are intentionally in source control.

Gitleaks 8.30.1 reports the Android client API key as `gcp-api-key`, and three CocoaPods checksums in `ios/Podfile.lock` (`FirebaseAuth`, `FirebaseAuthInterop`, `RNFBAuth`) as `generic-api-key`. Those Podfile hits are 40-character checksums, not credentials.

No `.env`, Admin SDK JSON, PEM, JKS, or release keystore is in the project tree. `dist/*.apk` and `dist/*.aab` are gitignored. `web.zip` is gitignored because `web/` is the site source.

## Release artifacts on disk (not in git)

As of packaging:

- `dist/GoldLedger-v1.0-vc2.apk` SHA-256 `fc7387f94ee4b1bceb51eeb90c4827391cd5574b74e4ec48e8b24f9c6ce78d55` matches `android/app/build/outputs/apk/release/app-release.apk`
- `dist/GoldLedger-v1.0-vc2.aab` SHA-256 `4b5c6645f205282892c7fde1e6af0067d3114a41631d14137301969642caeb51` matches `android/app/build/outputs/bundle/release/app-release.aab`
- APK badging: versionCode 2, versionName 1.0, com.goldtokenapp, minSdk 24, targetSdk 36, label Gold Ledger

These were not rebuilt during packaging. They were not compared to the binary Play is serving.

Public listing check on 11 November 2026: the Play page is live, developer ahsanrao, updated 10 September 2026, description matches `store-assets/full-description.txt`. A third-party mirror reports version 1.0 and Android 7.0+. `versionCode` was not on the public page. Exact binary equivalence to Play is **not** established.

## Website

`web/index.html`, `web/privacy.html` (last updated 15 August 2026), `web/delete-account.html`. Copyright line says Ahsan Rao. The deployed site returned the same product framing when fetched.

Privacy-policy claim not matched by a screen in this tree: in-app correction of name and email after signup. Name is written at signup via `updateProfile`. No profile editor was found.

## Store assets

`store-assets/` holds listing copy, `icon-512.png`, `feature-graphic-1024x500.png`, cropped screenshots, and raw captures from 16 August 2026. Visible accounts in those images are demonstration accounts (`John Doe`, `Play Review`, `playreview@goldledger.app`, `gigachad@goldledger.com`). No customer inbox was visible in the set reviewed for publication.

`listing-copy.md` notes the intended Play category as Finance, no ads, no in-app purchases, and an 18+ audience. The public listing extract showed content rating Everyone and did not echo the category field. Do not collapse those into one claim.

## Checks run on 11 November 2026

Node v24.13.0, Yarn 4.14.1.

- `npx tsc --noEmit` exit 2. Pre-existing errors in `src/components/Input.tsx`, `src/screens/DashboardScreen.tsx`, `src/screens/HistoryScreen.tsx`, `src/services/priceService.ts`, `src/store/store.ts`, `src/types/index.ts`.
- `npx jest --ci --watchAll=false --watchman=false` exit 1. Suite failed to parse `react-redux` ESM. 0 tests ran. The only test file is `__tests__/App.test.tsx`.
- `eslint .` exit 0, 0 errors, 3 `react-native/no-inline-styles` warnings (`BuyScreen.tsx`, `SellScreen.tsx`, `TransferScreen.tsx`).

No application source was modified to clear these. Manual end-to-end testing before Play publication was done by Muhammad and is separate from the results above.

## Repository hygiene

Git in the handoff folder had no commits and no remotes. This publication is the first history. It is not the client's original history.

Ignored on purpose: `node_modules/`, `android/local.properties`, `build/`, `.gradle/`, `.cxx/`, `.kotlin/`, `dist/` (APK and AAB), `web.zip`, `*.jks`, `*.keystore` except `debug.keystore`, `.env`, PEM/P12/private-key filenames, Firebase Admin JSON name patterns, `.yarn/install-state.gz`.

Do not print or commit upload-key passwords. Do not delete the keystore from the build machine.

## GitHub destination

Repository: https://github.com/izeeshanshabbir/gold-ledger

SSH remote, using the existing host alias and the existing key `~/.ssh/id_ed25519_izeeshanshabbir`:

```text
git@github-izeeshanshabbir:izeeshanshabbir/gold-ledger.git
```

Local git identity for this clone only: `izeeshanshabbir` / `izee.shabbir@gmail.com`.

On 11 November 2026 the GitHub repository existed, was public, and had no commits. The publication instructions say to keep the repository private unless public visibility is explicitly authorized. That authorization was not stated separately from the repository URL. Do not push this client source to the public remote until visibility is confirmed.

## Constraints for later changes

- Do not change Play production from this tree unless that is the actual task.
- Do not rotate or replace the Firebase project as a side effect.
- Do not refactor buy/sell/price sync unless the task is to change that behavior. They are shipped behavior, with the consistency limits above.
- Do not invent metrics, user counts, or test coverage. A third-party page mentioned a small install count. It is not a verified metric and should not be quoted.
- Preserve `com.goldtokenapp` and the release version until a real version bump is intended. A new Play upload needs a higher `versionCode`.
