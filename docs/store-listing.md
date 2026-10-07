COFFEE TIME — CHROME WEB STORE LISTING
======================================

Semua teks di bawah siap copy-paste ke dashboard Chrome Web Store.


────────────────────────────────────────────────────────────────
1. RINGKASAN (Summary) — maks 132 karakter
────────────────────────────────────────────────────────────────

After your time limit, the cursor changes and the page slowly blurs and darkens to remind you to rest.

(102 karakter — sudah dipakai di manifest, tinggal konfirmasi)


────────────────────────────────────────────────────────────────
2. DESKRIPSI LENGKAP (Description) — maks 16.000 karakter
────────────────────────────────────────────────────────────────
Versi di bawah: ~2.900 karakter. Aman.

--- COPY MULAI DARI SINI ---

Coffee Time is a simple, quiet reminder to step away from the screen.

Set a limit — 1 hour, 3 hours, or 6 hours. Chrome starts counting the moment you open it. When the limit passes, every web page changes so you cannot miss it: the cursor becomes a resting character, the page slowly blurs and darkens, and the tab title blinks "Time to Rest". Take a break, then pause or reset the reminder from the popup.

No accounts. No sign-up. No data collection. It works entirely offline.

HOW IT WORKS

Chrome opens and the clock starts from zero. The popup shows how much time is left and a progress bar. Before your limit, nothing happens and your browsing is untouched.

Once the limit is reached, three things happen on every page you visit:

• The cursor turns into a resting character — a calm visual nudge, not a popup you have to close
• The page slowly blurs and darkens in a gentle pulse, drawing focus back to you instead of the screen
• The tab title blinks between the page name and "Time to Rest", so you notice it even in a background tab

Everything reverses the moment you switch the reminder off in the popup.

SET IT YOUR WAY

• Choose your limit: 1 hour, 3 hours, or 6 hours. Changing it restarts the clock from zero.
• Pause anytime with a single switch. The clock genuinely freezes — the progress bar does not keep creeping, and no time you have already used is lost when you resume.
• Reset to zero whenever you want to start a fresh session, keeping your current limit.
• The limit returns to the default of 3 hours whenever Chrome is fully closed and reopened, so each browsing session starts clean.

DESIGNED TO STAY OUT OF THE WAY

The reminder only appears after your limit. Before that, there is no badge, no notification, no banner and no toolbar clutter — just a normal browser. It never blocks clicks, never covers content you need, and disappears instantly when you switch it off.

The visual effect is built to be light on your machine. It is animated in a way that keeps the work on your graphics processor rather than repainting the whole page every frame, so it stays smooth even on heavy sites. If you have "reduce motion" enabled in your system settings, the page still dims but the animation is skipped.

PRIVACY

Coffee Time collects nothing. It does not read the pages you visit, does not track you, and makes no network requests at runtime. Your timer setting is stored locally in your own browser and never leaves your device. There is no analytics, no telemetry, and no third-party service.

WHY INSTALL IT

• You lose track of time while working or scrolling and want a nudge that actually reaches you
• You prefer a visual reminder to a notification you swipe away
• You are looking for screens that get dimmer, not popups that interrupt
• You want something that works offline with no account and no data collection

A quiet way to notice how long you have been sitting there. Set a limit, get on with your work, and let Coffee Time tell you when it is time to step away.

--- SAMPAI SINI ---


────────────────────────────────────────────────────────────────
3. KATEGORI & BAHASA
────────────────────────────────────────────────────────────────

Kategori         : Productivity  (alternatif: Well-being)
Bahasa           : English (United States)
Halaman beranda  : (isi URL GitHub lu kalau sudah di-push)
URL dukungan     : (isi URL GitHub issues lu, atau email)


────────────────────────────────────────────────────────────────
4. JUSTIFIKASI PERMISSION (buat form Privacy practices)
────────────────────────────────────────────────────────────────

storage
  Saves the timer start time, the selected limit, and whether the
  reminder is paused. Stored only in chrome.storage.local on the
  user's device. Nothing is transmitted anywhere.

alarms
  Fires a check every 30 seconds so the reminder activates shortly
  after the selected time limit is reached, without keeping a
  background page running continuously.

tabs
  Reads the current tab's URLs to find the pages where the overlay
  and custom cursor should be applied, and to send the activation
  message. Tab content is never read or stored.

host_permissions: <all_urls>
  The reminder has to appear on whatever site the user is browsing
  when the limit is reached. The content script only injects visual
  styles (cursor image and overlay). It does not read, modify, or
  transmit page content, and it does not run on chrome:// pages.


────────────────────────────────────────────────────────────────
5. JAWABAN KUESIONER DATA PRIVACY
────────────────────────────────────────────────────────────────

"Does your extension collect or use user data?"
  -> No. Select "This item does not collect user data".

Alasan (kalau diminta):
  Coffee Time makes no network requests at runtime. The only data
  it handles is the user's own timer state, stored locally via
  chrome.storage.local and never transmitted off the device.

Single purpose description:
  Reminds the user to take a break by changing the cursor and
  dimming the page once a user-selected time limit has passed.


────────────────────────────────────────────────────────────────
6. KONTEN DEWASA
────────────────────────────────────────────────────────────────

Jawab: TIDAK ADA (No)
  Tidak ada konten seksual, kekerasan, kata kasar, maupun konten
  terkait alkohol/tembakau/narkoba. Satu-satunya aset adalah
  ilustrasi karakter santai dan ikon cangkir kopi (kopi sebagai
  tema, bukan promosi alkohol).


────────────────────────────────────────────────────────────────
7. REMOTE CODE
────────────────────────────────────────────────────────────────

"Does your extension use remote code?"
  -> No. Semua JavaScript dikemas di dalam paket. Tidak ada
     eval(), tidak ada script dari CDN, dan font di-host sendiri
     di dalam folder extension.
