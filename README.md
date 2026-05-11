# StartupCookie Website

Source for [startupcookie.com](https://startupcookie.com). Static HTML/CSS/JS deployed via Vercel.

- **GitHub:** https://github.com/samclaassen/startupcookie-web
- **Vercel project:** https://vercel.com/sam-cs-projects-f4d7dd5b/startupcookie
- **Live site:** https://startupcookie.com

Every push to `main` auto-deploys to startupcookie.com (usually within 30 seconds).

---

## Setting up a new machine

Open Terminal and run:

```bash
# 1. Install GitHub CLI if you don't have it
brew install gh

# 2. Log into GitHub
gh auth login

# 3. Clone the repo
cd ~/Documents
git clone https://github.com/samclaassen/startupcookie-web.git
cd startupcookie-web
```

You now have an identical working copy.

---

## Daily workflow

**Before you start editing — always pull first** so you have the latest changes from the other machine:

```bash
cd ~/Documents/startupcookie-web
git pull
```

**After you make changes:**

```bash
git add .
git commit -m "describe what you changed"
git push
```

The `git push` triggers an auto-deploy. Watch it at the [Vercel dashboard](https://vercel.com/sam-cs-projects-f4d7dd5b/startupcookie).

---

## If you forget to pull first

You'll see something like:

```
! [rejected] main -> main (fetch first)
error: failed to push some refs
```

That means the other machine has changes you don't have yet. Fix it with:

```bash
git pull --rebase
git push
```

If there's a real conflict (both machines edited the same lines), git will tell you which file and pause. Open the file, look for `<<<<<<<` markers, keep what you want, save, then:

```bash
git add .
git rebase --continue
git push
```

---

## File layout

```
index.html         Main page
styles.css         Styles
script.js          JavaScript
assets/            Images, SVGs, logos
.gitignore         Files git should ignore
README.md          This file
```

---

## Useful commands

| Task                                 | Command                              |
| ------------------------------------ | ------------------------------------ |
| See what changed                     | `git status`                         |
| See line-by-line diff                | `git diff`                           |
| Discard local changes to a file      | `git restore <file>`                 |
| See recent commits                   | `git log --oneline -10`              |
| Undo last commit (keep changes)      | `git reset --soft HEAD~1`            |
| See which machine made a change      | `git log -p <file>`                  |

---

## Local preview before pushing

Open `index.html` directly in your browser — that's it. No build step.

If you want a proper local server (so relative paths behave like production):

```bash
cd ~/Documents/startupcookie-web
python3 -m http.server 8000
# then visit http://localhost:8000
```
