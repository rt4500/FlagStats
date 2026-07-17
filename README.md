# Flag Stats — Live Tracker

A single-file web app for **live play-by-play stat tracking** in 5v5 flag football
(IFAF rules: 4 downs to reach midfield, 4 more to score). Built for logging on a
phone or tablet at the sideline. Works fully offline, stores each game locally on
the device, and exports JSON/CSV so you can combine games across devices into
tournament-wide stats.

No build step, no dependencies — it's just `index.html`.

---

## Deploy to GitHub Pages

You get a public URL you can open on any device. Two ways:

### Option A — GitHub Actions (recommended, auto-deploys on every push)

1. Create a new GitHub repo and push these files to the `main` branch.
2. In the repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. That's it. Every push to `main` redeploys automatically (see the included
   `.github/workflows/deploy.yml`). The live URL appears under **Settings → Pages**
   and in the Actions run summary. It looks like:
   `https://<your-username>.github.io/<repo-name>/`

### Option B — Deploy from a branch (no Actions)

1. Push these files to `main`.
2. **Settings → Pages → Source → Deploy from a branch → `main` / `/ (root)` → Save.**
3. Wait ~1 minute, then open the URL shown on that page.

> First deploy can take a minute or two. After that, updates are near-instant.

### Quick push from your machine

```bash
git init
git add .
git commit -m "Flag Stats app"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

---

## Install on a phone / tablet (offline app)

Once the Pages URL is open in a browser:

- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** menu (⋮) → **Add to Home screen** / **Install app**.

It then launches full-screen like a native app and works with no connection.
The app caches itself on first load; when you're online it always pulls the
newest version, and offline it falls back to the last cached copy.

---

## Using it

- **Teams & Games** — add teams (type players in or paste a roster), then create a
  game. A **Load 7 test nations** button seeds sample rosters for testing.
- **Live** — tap PASS/RUN, pick the player, then **drag or tap the field** to set
  where the play ended (yards are computed automatically). Handles completions,
  incompletions, interceptions, sacks, penalties, touchdowns, and PAT/2-pt
  conversions with player attribution. **Undo** is always available.
- **Tournament** — load the exported JSON from each game (each device / each match)
  to see combined leaderboards, and export everything as CSV.

### Where's my data?

Each game is stored in that device's browser (`localStorage`) under this site's
URL. It stays put across reloads and offline use. To move a game to another device
or combine games, use **Export** (JSON) and load them in the **Tournament** tab.

> Because storage is per-URL, keep using the same Pages URL. Clearing browser data
> for the site, or using private/incognito mode, will remove locally stored games —
> export anything you want to keep.

---

## Forcing an update on devices

The app is network-first, so an online device gets the latest automatically on
reload. If a device seems stuck on an old version (offline cache), bump the
`CACHE` version string in `sw.js` (e.g. `flag-stats-v1` → `flag-stats-v2`) and push.

---

## Files

```
index.html                     the entire app
manifest.webmanifest           makes it installable (name, icons, colors)
sw.js                          service worker for offline use
icons/                         app icons
.github/workflows/deploy.yml   auto-deploy to GitHub Pages
```

## License

MIT — see `LICENSE`.
