/**
 * Externally hosted pages referenced from inside the app.
 *
 * These are served as static HTML from the `web/` folder at the repo root.
 * Google Play requires the privacy policy and the account-deletion page to be
 * publicly reachable without signing in, and the same URLs are entered in the
 * Play Console listing.
 *
 * Keep these in step with what is entered in the Play Console — Google checks
 * that the privacy policy and account deletion URLs resolve.
 */
const WEB_BASE = 'https://goldledger-lilac.vercel.app';

export const Links = {
  privacyPolicy: `${WEB_BASE}/privacy.html`,
  deleteAccount: `${WEB_BASE}/delete-account.html`,
  supportEmail: 'ahsannisar446@gmail.com',
};
