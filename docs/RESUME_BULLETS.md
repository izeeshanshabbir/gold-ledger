# Résumé bullets — Gold Ledger

Bullets cover release engineering on an inherited React Native client. They do not claim authorship of the original trading application. No user counts, revenue, or performance percentages are included; none were measured in this project record.

- Prepared an inherited React Native 0.81 / TypeScript trading simulator for Google Play as Gold Ledger: Trading Sim (`com.goldtokenapp`, versionName 1.0, versionCode 2), including a release-blocker audit, store compliance, and end-to-end testing of the Android build before publication.
- Implemented in-app account deletion against Firebase Authentication and Cloud Firestore: reauthenticate with the password, delete the `transactions` subcollection in batches, delete the user document, delete the Auth user, and purge the Redux Persist cache so the deleted wallet cannot be restored.
- Shipped the public privacy policy and account-deletion page, and linked both from signup and the profile drawer, including an explicit exception for transfer records that remain on the counterparty's account.
- Configured Android release signing so the upload keystore path, alias, and passwords are read from machine-local Gradle properties and are not stored in the repository.
- Produced the Play listing copy, 512 px icon, feature graphic, and screenshots, with the virtual-money disclosure in the store title, short description, and full description.
- Kept the shipped client behavior intact where it was already complete: Firebase email auth, simulated pricing, buy, sell, atomic token transfers, charts, and transaction history on Redux Toolkit and Redux Persist.
