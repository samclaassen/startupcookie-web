# Editing startupcookie.com

**Repo:** https://github.com/samclaassen/startupcookie-web (private)
**Live:** https://startupcookie.com

There is no staging site. Anything saved to `main` is live in about 30 seconds.
Nothing is ever lost, any change can be reverted in three clicks (see the bottom).

---

## Finding the page you want to edit

The site is 33 pages. **The URL tells you the file.** Take the part after
startupcookie.com, add `/index.html`.

| Page on the site | File in the repo |
| --- | --- |
| startupcookie.com | `index.html` |
| /about | `about/index.html` |
| /services | `services/index.html` |
| /services/aeo-content | `services/aeo-content/index.html` |
| /case-studies/venn | `case-studies/venn/index.html` |
| /guides/founder-led-content | `guides/founder-led-content/index.html` |

Full list of folders: `about`, `agencies`, `blog`, `case-studies`, `compare`,
`guides`, `press`, `services`.

---

## Common edits that do NOT need HTML

Open **`site-config.js`** in the repo root. It is 17 lines and controls values that
appear across every page:

- `NEXT_OPENING` – the "next slot opens" date in the hero and pricing card. Set to `null` to hide the line.
- `CLIENT_COUNT` – shows "Current roster: 4/6" on the homepage. At `MAX_CLIENTS` the booking buttons switch to "Join the waitlist".
- `MAX_CLIENTS` – roster size.
- `GA4_MEASUREMENT_ID` – paste a `G-XXXXXXXXXX` here once and analytics turns on site-wide. `null` means no tracking.

Change the value between the quotes, save, done. Do not touch anything else in that file.

---

## Editing text (browser, no install)

1. Go to https://github.com/samclaassen/startupcookie-web
2. Press the **`.`** key on its own. A full editor opens in the browser.
3. In the left file list, open the file for your page (see table above).
4. **Cmd + F**, search the wording you want to change, edit it.
5. Click the **Source Control** icon in the far-left toolbar (branching-line icon, blue badge).
6. Type a short message, click **Commit & Push**.

Live in ~30 seconds.

**Only edit the sentences.** Leave everything inside `class="..."` alone, that is styling.

---

## Bigger changes (Claude Code)

1. Install [GitHub Desktop](https://desktop.github.com), sign in, **File → Clone repository → startupcookie-web**.
2. Install [Claude Code](https://claude.com/claude-code), point it at the folder.
3. **Always click Fetch origin / Pull origin in GitHub Desktop before you start.**
4. Describe the change in plain English, review it, then Commit and Push.

---

## Preview before it goes live

For anything structural. Vercel builds a private preview URL for every branch.

1. In the browser editor, click `main` in the bottom-left, **Create new branch**, name it.
2. Edit and Commit & Push as normal. The live site is untouched.
3. On github.com a banner offers **Compare & pull request**. Click through.
4. The Vercel bot posts a preview link in the pull request. Check it.
5. Happy: **Merge pull request**. Not happy: close it, nothing happened.

---

## If something breaks

1. Go to https://github.com/samclaassen/startupcookie-web/commits/main
2. Click the change that broke it.
3. **Revert → Create pull request → Merge.**

Back to normal in 30 seconds.

---

## Two rules

1. **Pull before you edit.** Sam works from two machines. The browser editor handles this automatically; in GitHub Desktop click **Fetch origin** first, every time.
2. **Write real commit messages.** `Update pricing headline` is useful in six months. `changes` is not.
