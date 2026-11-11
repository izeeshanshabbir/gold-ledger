# Case study: shipping Gold Ledger to Google Play

## 1. Project summary

Gold Ledger: Trading Sim is an Android application that lets someone practice gold-token trading with virtual money. A new account starts with 10,000 virtual cash. The user can buy and sell tokens at a simulated price, transfer tokens to another account by email, watch a price chart, and review transaction history. Nothing in the client charges a card, accepts a deposit, or talks to a bullion or brokerage API.

The published Android package is `com.goldtokenapp`. The Play listing title is "Gold Ledger: Trading Sim". The launcher label is "Gold Ledger". In this source tree the Android release identity is `versionName` 1.0 and `versionCode` 2, with `minSdk` 24 and `targetSdk` 36.

The app is a React Native 0.81.5 TypeScript client. Firebase Authentication stores the login. Cloud Firestore stores the user document, the transaction subcollection, and the shared simulated market. Redux Toolkit holds the session, wallet, and a mostly unused transaction slice. Redux Persist writes those slices to AsyncStorage.

The Google Play listing is live: [play.google.com/store/apps/details?id=com.goldtokenapp](https://play.google.com/store/apps/details?id=com.goldtokenapp). The support site is [goldledger-lilac.vercel.app](https://goldledger-lilac.vercel.app/).

## 2. Client handoff and initial project state

This was an existing client codebase, handed over so it could be made ready for release and published on Google Play. I did not design or build the original trading product.

At handoff the application already had email signup and login, a Firestore user wallet, buy, sell, email transfer, a hybrid simulated price, market and portfolio charts, transaction history, and an emergency virtual cash top-up. Navigation was a login stack plus four bottom tabs. The Android package name was already `com.goldtokenapp`.

The iOS project was still carrying the React Native template bundle identifier. Android was the release platform. There was no Firebase Admin SDK, no Cloud Functions tree, and no Firestore rules file in the project. Signing material for Play was not something that could be committed with the source.

The workspace used for publication had Git initialized and no commits. The earlier client history was not in this folder, so it cannot be reconstructed from this repository.

## 3. My assigned responsibilities

The release engagement covered:

- Auditing the inherited app for release blockers
- Implementing account deletion
- Integrating the privacy policy and account-deletion page, inside the app and on the public site
- Configuring Android upload signing without putting the keystore in source control
- Preparing branding and Play listing assets
- Handling the Google Play requirements that depend on those pieces
- Testing the finished application end to end before publication

The trading engine, price model, navigation structure, and most screens stayed as inherited behavior. I did not rewrite them for the release.

## 4. Release-readiness audit

The audit was a read of the inherited client, not a redesign. The points below are what the current source still does. They were release facts to understand, not a list of changes made in this engagement.

**Product framing.** The app mutates balances that look like money. Play review needs to see that the money is virtual. The shipped UI says so on the dashboard, the profile drawer, and the signup screen. The listing copy says so in the title, the short description, and the first paragraph of the full description.

**Client-authoritative balances.** `buyTokens` and `sellTokens` read `cashBalance` and `tokenBalance` from Redux, compute the next numbers, then call `updateUserWallet` and `recordTransaction` as two separate writes. A concurrent session can overwrite a balance, and a wallet write can succeed if the transaction write fails. Transfers do not have that gap: `transferTokensAtomic` uses one Firestore transaction, re-reads both documents inside it, and refuses the transfer if the sender no longer has the tokens.

**Shared price written by every client.** `priceService` starts from `market/gold` or from 65.5. About every 10 seconds it generates a new price locally: a random fluctuation, a small upward drift, and mean reversion toward 65.5, then clamps the result to the range 50–100. About every 60 seconds the same client writes `market/gold` and appends `market/gold/history`. Every open dashboard runs that loop. There is no scheduled backend owner in this repository.

**History limits.** Market and portfolio charts request 72 price documents. Activity loads 50 transactions and also subscribes to the same query, so opening the screen pays for an initial read and the listener's initial snapshot.

**Recipient lookup.** A transfer calls `userExists` and then `getUserIdByEmail`. Both query `users` by email with `limit(1)`.

**Emergency funds.** The drawer calls `claimEmergencyFunds` for 10,000 virtual cash. `addEmergencyFunds` runs a Firestore transaction and adds that amount. There is no cooldown and no separate audit transaction type.

**Persist scope.** The root persist config whitelists `auth`, `wallet`, and `transactions`. Logout clears the auth user in Redux. It does not, by itself, wipe the persisted wallet. Account deletion does, because the drawer calls `persistor.purge()` after a successful delete.

**What was not in the tree.** No payment SDK in `package.json`. No Admin private key. No Play service-account JSON. Firestore rules live in the Firebase console, not in this repo, so the audit could not prove how writes are restricted server-side.

## 5. Technical challenges

The release problems were integration and policy problems sitting on top of a working simulator.

The deletion flow had to be safe for a session that Redux Persist may have restored days earlier. Firebase rejects `user.delete()` with `auth/requires-recent-login` in that situation. Deleting the Auth user first would also remove the credential required to delete that user's Firestore documents.

Play requires a privacy-policy URL and an account-deletion URL that work without an account. Those pages had to describe the same behavior the app actually performs, including the transfer record that remains on the other person's account.

The upload key had to sign `versionCode` 2 without becoming part of the git tree. A machine that does not have the key still needs to be able to configure the Gradle project.

The store listing had to make the simulation obvious to a reviewer reading the title, short description, and screenshots, while the Android `applicationId` stayed `com.goldtokenapp`.

## 6. Account deletion implementation

The implementation is `deleteAccount` in `src/store/slices/authSlice.ts`, started from `ProfileDrawer`.

The drawer asks for confirmation, then opens a modal that requires the password. Empty input never calls Firebase. On success the drawer purges the persistor, closes itself, and the auth slice sets `user` to null and `isAuthenticated` to false, which returns the navigator to the login stack.

Server order inside the thunk:

1. Read `auth().currentUser`. If there is no user or no email, stop.
2. Build an email credential and call `reauthenticateWithCredential`. Nothing is deleted before this succeeds.
3. Repeatedly query `users/{uid}/transactions` with `limit(400)`. Delete the page with a batched write. A short page ends the loop. A full page means another query.
4. Delete `users/{uid}`.
5. Call `currentUser.delete()`.

Error codes are mapped before they reach the UI. Wrong password and `auth/invalid-credential` tell the user the account was not deleted. Too many requests, network failure, and a stale token each get their own message. Other failures use a generic message rather than a raw Firebase string. The other auth thunks still return `err.message`.

What this does not delete:

- The counterparty's transfer document. The sender's copy includes `receiverEmail`. The receiver's copy includes `senderId` and `receiverId` and does not include `receiverEmail`. Deleting one user leaves the other user's copy in place.
- `market/gold` and its history. Those documents are shared simulation state.
- An Auth user that fails to delete after the Firestore documents are already gone. The thunk does not roll the Firestore deletes back. There is no Cloud Function or Admin SDK job in this repo to finish a partial delete.

The in-app copy matches that scope: the confirmation says the account, balances, and transaction history are removed and cannot be undone. The public page adds the counterparty exception in its own section.

## 7. Firebase authentication and data deletion considerations

Auth is email and password only. Signup calls `createUserWithEmailAndPassword`, sets `displayName`, and creates `users/{uid}` with the name, email, uid, 10,000 cash, and 0 tokens. Login reads the Auth user and does not read the Firestore profile. The name shown later is the Auth `displayName` restored into Redux, or the email local-part if that name is empty.

Passwords are not written to Firestore by this client. The privacy policy says Firebase Authentication stores them. That matches the client code, which only sends the password to Auth.

Deletion is performed with the client SDK, as the user who just reauthenticated. It can succeed only if Firestore rules allow that user to delete their user document and the transaction documents. Those rules are not in the repository and were not exported into this source drop. Publishing the client does not include an Admin credential that could bypass rules.

There is no server trigger to delete Firestore data when an Auth user is removed from the Firebase console. The in-app order is the reverse on purpose: Firestore data first, Auth user last.

Someone who cannot sign in cannot run this thunk. `web/delete-account.html` tells them to email `ahsannisar446@gmail.com` from the registered address. The page says the request is confirmed normally within 7 days and always within 30. That text is the published support commitment. This repository does not contain a log of those requests.

`Links.supportEmail` is the same address. The profile drawer opens the privacy and deletion URLs from `src/config/links.ts`. Signup opens the privacy URL from the same module. The base URL is `https://goldledger-lilac.vercel.app`.

## 8. Privacy and Google Play compliance

`web/privacy.html` is dated 15 August 2026. It names the publisher as Ahsan Rao, Pakistan, and the contact as `ahsannisar446@gmail.com`. It says the app collects name, email, password (handled by Firebase Auth), the Firebase uid, and in-app virtual balances and transactions. It says the app does not collect location, contacts, photos, files, advertising identifiers, or biometrics, and that the only Android permission is internet. The manifest in this tree requests `INTERNET` and no other permission. `android:allowBackup` is false.

The policy says traffic to Firebase uses HTTPS/TLS. It says account data is kept until the user deletes it, with the transfer-record exception described above. It says the app is for users 18 and over.

One policy sentence is broader than the UI I can find. It says the user can access and correct their name and email from within the app. Signup writes the name once, through `updateProfile`. I do not find a later screen that edits name or email. I did not change that sentence during publication packaging.

The deletion page, `web/delete-account.html`, gives the five in-app steps: open the dashboard avatar, tap Delete Account, continue, enter the password, tap Delete Forever. It lists what is removed and the counterparty record that remains. Both pages are linked from `web/index.html`, which states that no real money is involved.

Play's public listing, fetched while this repository was prepared, repeats the full description stored in `store-assets/full-description.txt` and the short description in `store-assets/short-description.txt`. The live Data safety section says the app may collect personal info and app activity, that data is encrypted in transit, that the user can request deletion, and that no data is shared with third parties. Those are the developer's store declarations. I did not re-open the Play Console form during this packaging pass.

The listing page shows the content rating Everyone. The privacy policy and the listing notes in `store-assets/listing-copy.md` describe an 18-and-over audience. I am not treating those as the same field. Content rating and target audience are separate Play forms, and only the public rating was visible.

`store-assets/listing-copy.md` records the categorization used for the listing work: App, with Finance as the intended category, no ads, no in-app purchases, and the financial-features declaration that the app does not provide real financial features. The public listing page I fetched did not print the category label in its extracted text. I am not asserting a category beyond what that page and the listing notes actually show.

## 9. Android release signing and build preparation

`android/app/build.gradle` keeps two signing configs.

Debug uses `android/app/debug.keystore`, alias `androiddebugkey`, and the standard Android debug passwords. That keystore is the usual React Native debug key and is not the key that signs the Play upload.

Release reads four Gradle properties only when they are present:

- `GOLD_LEDGER_UPLOAD_STORE_FILE`
- `GOLD_LEDGER_UPLOAD_STORE_PASSWORD`
- `GOLD_LEDGER_UPLOAD_KEY_ALIAS`
- `GOLD_LEDGER_UPLOAD_KEY_PASSWORD`

On the release machine they live in `~/.gradle/gradle.properties`. The upload keystore file is outside the project directory. I confirmed that the file referenced by the Gradle comment is present on the release machine. Its bytes and passwords are not in this repository and are not recorded in this case study.

If the properties are absent, the release `signingConfig` stays empty so configuration does not fail on a machine that only needs to read the project. A release artifact built that way is unsigned.

The Play binary has to be an Android App Bundle signed with the upload key. The commands are `./gradlew bundleRelease` and, for a sideload APK, `./gradlew assembleRelease`. This packaging pass did not run Gradle again.

`dist/GoldLedger-v1.0-vc2.apk` and `dist/GoldLedger-v1.0-vc2.aab` were already on disk. `aapt dump badging` on the APK reports package `com.goldtokenapp`, `versionCode` 2, `versionName` 1.0, minSdk 24, targetSdk 36, and label "Gold Ledger". SHA-256 of that APK matches `android/app/build/outputs/apk/release/app-release.apk`. SHA-256 of the AAB matches `android/app/build/outputs/bundle/release/app-release.aab`. So the `dist/` copies are the release outputs of this workspace, not a second variant. Both are gitignored.

## 10. Branding and store assets

The launcher name in `strings.xml` is Gold Ledger. The store title in the listing notes is "Gold Ledger: Trading Sim", which fits the 30-character Play limit and puts the simulation in the name a reviewer sees.

Assets kept with the source:

- `store-assets/icon-512.png`
- `store-assets/feature-graphic-1024x500.png`
- `store-assets/screenshots/` — dashboard holdings, market, buy, sell, transfer, portfolio, history, and the cash view of the dashboard
- Device captures taken on 16 August 2026, kept next to the cropped set
- `store-assets/short-description.txt`, `full-description.txt`, and `listing-copy.md`
- `logo.jpeg` at the repository root

The screenshots I reviewed show demonstration identities: "John Doe", "Play Review", `playreview@goldledger.app`, and `gigachad@goldledger.com`. I did not find a personal inbox, a phone number, or a customer account in them. Status-bar chrome on the raw captures shows the time and ordinary device icons.

The root `logo.jpeg` and the launcher mipmaps are the in-repo branding. I did not redraw the product UI for the store.

## 11. Testing and quality assurance

I tested the completed Android application myself, end to end, before it was published. That pass covered the real client: account creation, sign-in, the simulated market, buy, sell, transfer, history, and account deletion, on the build that was prepared for Play. It was manual testing. This repository does not contain a test script, a device log, or a coverage number from that pass, so I am not attaching a metric to it.

Automated checks run later, while packaging this source tree, are a different result. They were not used as the release gate.

- `npx tsc --noEmit` failed on type errors that were already in the tree: style typing in `Input.tsx` and `DashboardScreen.tsx`, transaction `type` as `string` versus the union in `HistoryScreen.tsx`, `NodeJS.Timeout` in `priceService.ts`, a `RootState` import from `redux-persist` in `store.ts`, and slice state types that are not exported from `src/types/index.ts`.
- Jest did not run the single test. `__tests__/App.test.tsx` renders `App`, and Jest stopped on an `import` statement inside `react-redux`'s ESM build.
- `eslint .` exited 0 with three `no-inline-styles` warnings, in the buy, sell, and transfer screens.

I left those failures in place. Changing them would have been an unrelated code edit to a shipped client.

No new Gradle release build was run during packaging. The version check used the APK and AAB already produced from this tree.

## 12. Google Play publication workflow

Publication used the pieces above rather than a second codebase.

The bundle is the release AAB for `com.goldtokenapp`, versionCode 2, versionName 1.0, signed with the upload key that stays on the build machine. The store listing used the title, short description, and full description in `store-assets/`, the 512 px icon, the feature graphic, and the screenshots. The public privacy URL and the public deletion URL are the `web/` pages on `https://goldledger-lilac.vercel.app`, which is also `Links` in the app. The website was already deployed when this repository was prepared. I fetched it and the Play listing. Both resolved.

The live listing shows developer name ahsanrao, support email `ahsannisar446@gmail.com`, an update date of 10 September 2026, and the same description as `full-description.txt`. A store mirror reports version 1.0 and Android 7.0 or later. Android 7.0 is `minSdk` 24. The official listing extract did not show `versionCode`. I did not download the Play APK, so I cannot claim the served binary is byte-identical to `dist/GoldLedger-v1.0-vc2.aab`.

I am not describing console clicks I did not record. There is no Play Console credential in this repository.

## 13. Verified final outcome

The application is publicly listed:

- [Google Play, `com.goldtokenapp`](https://play.google.com/store/apps/details?id=com.goldtokenapp)
- [https://goldledger-lilac.vercel.app/](https://goldledger-lilac.vercel.app/)

What I can verify from this machine:

- The Android source identity is `com.goldtokenapp`, versionName 1.0, versionCode 2.
- The local release APK reports that same identity, and the local AAB is the matching Gradle bundle output.
- The public description matches the listing copy in the repo.
- Account deletion, the legal URLs, and the release signing property names are present in source.
- The upload keystore and its passwords are not in the project tree.

What I cannot verify from this machine:

- That Google Play is serving this exact AAB rather than another build with the same version name.
- The Firestore security rules that authorize the client writes and the account-deletion deletes.
- A written record of the manual end-to-end pass beyond the fact that I performed it before release.

## 14. Technology stack

- React Native 0.81.5, React 19.1.0, TypeScript 5.8
- React Navigation 7, native stack and bottom tabs
- Redux Toolkit 2, Redux Persist 6, AsyncStorage 3
- `@react-native-firebase/app`, `auth`, and `firestore` 22.4.0
- Hermes and the React Native New Architecture (`newArchEnabled=true`)
- Android Gradle Plugin via the React Native Gradle plugin, Gradle wrapper 8.14.3, Kotlin 2.1.20, compileSdk 36, build-tools 36.0.0, NDK 27.1.12297006, minSdk 24, targetSdk 36
- Yarn 4.14.1
- Static HTML on Vercel for the support site
- Google Play for distribution

`react-native-gifted-charts` is a dependency. The market chart component in `src/components/MarketLineChart.tsx` draws with `react-native-svg`.

## 15. Technical lessons and engineering decisions

**Delete data before the Auth user, and reauthenticate first.** A persisted React Native session is a normal login, not a fresh one. Firebase still treats it as stale for account deletion. Proving the password up front also means a wrong password cannot destroy the wallet.

**Subcollections are a separate delete.** Removing `users/{uid}` leaves `users/{uid}/transactions` in place. The batch loop exists because of that Firestore rule, not as a general cleanup helper.

**Say what a transfer leaves behind.** A complete "delete all personal data" claim would have been false. The other participant's ledger row is their record. The privacy page and the deletion page both say so.

**Keep the upload key off the source tree.** The Gradle file names the four properties and still configures when they are missing. That is the difference between a build machine and a clone that should not be able to ship an update.

**Do not treat a simulator's client writes as a backend design to silently replace at release time.** Buy, sell, and the per-client price sync were inherited and shipped. Documenting them is part of the engineering record. Replacing them with Cloud Functions would have been a behavior change, not a release fix, and it was not part of this work.

**Store compliance is copy plus a working URL.** The in-app links, the static pages, and the Play listing have to name the same actions. `links.ts` is the in-app source of those URLs so the drawer and the signup screen cannot drift from each other.

## 16. Live links and screenshots

- Play listing: https://play.google.com/store/apps/details?id=com.goldtokenapp
- Website: https://goldledger-lilac.vercel.app/
- Privacy policy: https://goldledger-lilac.vercel.app/privacy.html
- Account deletion: https://goldledger-lilac.vercel.app/delete-account.html
- Source: https://github.com/izeeshanshabbir/gold-ledger

Screenshots in `store-assets/screenshots/`:

| File | What it shows |
| --- | --- |
| `01-dashboard-holdings.png` | Virtual gold balance and the simulation notice |
| `02-market-chart.png` | Simulated spot price and history |
| `03-buy.png` | Buy quote at the current simulated price |
| `04-sell.png` | Sell quote back into virtual cash |
| `05-transfer.png` | Transfer to another account by email |
| `06-portfolio-chart.png` | Current balances applied to price history |
| `07-history.png` | Buy, sell, and sent transfer |
| `08-dashboard-cash.png` | The same dashboard with cash selected |

The device captures alongside that folder are the 16 August 2026 source shots, including the profile drawer with Delete Account, Privacy Policy, and Deletion Help.
