# Gold Ledger: Trading Sim

**Android · React Native · TypeScript · Firebase · Google Play**

Gold Ledger is a gold-trading simulator. People practice buying, selling, and transferring gold tokens with virtual cash. The market price is generated in the app. No real gold, currency, or cryptocurrency moves, and the app does not take payment.

The Android app is published as [Gold Ledger: Trading Sim](https://play.google.com/store/apps/details?id=com.goldtokenapp) (`com.goldtokenapp`). A short support site, privacy policy, and account-deletion page are at [goldledger-lilac.vercel.app](https://goldledger-lilac.vercel.app/).

## My role

This was an existing client application. I took it through production readiness and Google Play release. I did not build the original product.

I audited the inherited client for release blockers, implemented account deletion, connected the legal pages inside the app, set up Android upload signing outside the source tree, prepared the store listing and screenshots, and tested the finished build end to end before publication.

The publisher named on the store listing and the privacy policy is Ahsan Rao.

## What a user can do

- Create an account and start with 10,000 virtual cash
- Buy and sell gold tokens at a simulated price that updates on the device
- Transfer tokens to another Gold Ledger user by email
- Read a market chart and a portfolio chart
- Review buy, sell, and transfer history
- Delete the account and its wallet data from the profile drawer

## Technical highlights

- React Native 0.81 and TypeScript, with React Navigation, Redux Toolkit, and Redux Persist
- Firebase Authentication for email login, Cloud Firestore for the wallet, transactions, and shared simulated market
- Transfers commit both balances and both ledger entries in a single Firestore transaction
- Account deletion reauthenticates a long-lived persisted session, pages out the transaction subcollection, then removes the user document and the Auth user
- Release identity `versionName` 1.0 / `versionCode` 2, minSdk 24, targetSdk 36, Hermes, New Architecture enabled
- Upload signing via Gradle properties that never enter the repository

## Links

- [Google Play](https://play.google.com/store/apps/details?id=com.goldtokenapp)
- [Website](https://goldledger-lilac.vercel.app/)
- [Privacy policy](https://goldledger-lilac.vercel.app/privacy.html)
- [Delete account](https://goldledger-lilac.vercel.app/delete-account.html)
- [Source](https://github.com/izeeshanshabbir/gold-ledger)
- [Case study](CASE_STUDY.md)
