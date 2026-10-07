# Privacy Policy — Coffee Time

**Last updated: 7 October 2026**

Coffee Time is a Chrome extension that reminds you to take a break. This
policy explains what the extension does and does not do with your information.

## Summary

Coffee Time does not collect, store, or transmit any personal data. There is
no account, no sign-in, no analytics, and no network connection at runtime.

## What the extension stores

Coffee Time saves a small amount of data locally in your own browser, using
Chrome's built-in `chrome.storage.local` API:

- The time at which your current browsing session started
- The time limit you selected (1 hour, 3 hours, or 6 hours)
- Whether you have paused the reminder, and when you paused it

This data never leaves your device. It is not sent to the developer, to
Google, or to any third party. It is not linked to your identity, your Google
account, or your browsing history. Removing the extension deletes it.

## What the extension does not do

- It does not read the content of the pages you visit.
- It does not record, store, or transmit your browsing history.
- It does not use cookies, tracking pixels, fingerprinting, or advertising
  identifiers.
- It does not make any network requests while it is running.
- It does not include analytics, telemetry, or crash reporting.
- It does not sell or share data with anyone, because it has none to sell.

## Permissions and why they are needed

**`storage`** — Saves the timer state described above, locally on your device.

**`alarms`** — Checks the timer every 30 seconds so the reminder can appear
shortly after your selected limit is reached, without keeping a background
script running continuously.

**`tabs`** — Identifies which open pages the visual reminder needs to appear
on, and sends them the activation message. A tab's address is read only to
decide whether the page may be modified. Page content is never read.

**Access to all websites** — The reminder has to appear on whichever site you
happen to be reading when your time limit passes, so the extension needs to be
able to run on any page. On those pages it only adds visual styling: a custom
cursor image and a dark overlay. It does not read, change, or transmit page
content. It does not run on Chrome's internal pages (`chrome://`), the Chrome
Web Store, or the built-in PDF viewer.

## Third parties

Coffee Time contains no third-party services, SDKs, or advertising networks.
The only bundled asset of note is the Nunito typeface, which is shipped inside
the extension rather than loaded from a server. It is licensed under the SIL
Open Font License 1.1.

## Children's privacy

Coffee Time collects no data from anyone, including children under 13. There
is nothing to collect.

## Changes to this policy

If a future version of Coffee Time ever handles data differently, this page
will be updated before that version is released, and the "Last updated" date
above will change. The current version collects nothing, and any change in
that behaviour would be disclosed here.

## Contact

Questions about this policy can be sent to:

**hanacarakasafeyz@gmail.com**

---

*Coffee Time is an independent project. It is not affiliated with Google or
Chrome.*
