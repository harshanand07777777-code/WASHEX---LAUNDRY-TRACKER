# Washex — Team GitHub Workflow

## Team ownership

| Member | Existing branch | Pages | JavaScript |
|---|---|---|---|
| Mohit | `Mohit-Rao` | `Login.html`, `SignUp.html` | `scripts/login.js`, `scripts/signup.js` |
| Arun | `Arun-rao` | `TrackPage.html` | `scripts/tracking.js` |
| Yash | `Yash-Dagar-washex` | `About.html`, `Services.html` | `scripts/about.js`, `scripts/services.js` |
| Team leader | `Harsh-Anand` | `LaundryStatus.html` | `scripts/status.js` |
| Deepak | `Deepak` | `ContactUs.html` | `scripts/contact.js` |

## Shared files

- `scripts/common.js` contains shared response/message helpers. Do not make separate copies.
- `server.js` is the shared Node.js backend. The team leader should coordinate changes to it.
- `data/` contains local application data. Do not commit real personal information or passwords.
- `scripts/script.js` is retained as a legacy notice; do not add it to HTML pages.

## Before each member starts

1. Fetch/pull the latest `main`.
2. Switch to their existing personal branch.
3. Merge or rebase the latest `main` into that branch before editing.
4. Edit only their assigned page, CSS, and JavaScript files.
5. Test the page through the Node server (`node server.js`), not by opening the HTML file directly.
6. Commit and push only their changes.
7. Open a Pull Request into `main`; the team leader reviews and merges it.

## Run locally

From the project root (the folder containing `server.js`):

```bash
node server.js
```

Open `http://localhost:3000/` or a page such as `http://localhost:3000/pages/Login.html`.

## Important hosting note

GitHub Pages serves static files only. It does not run this Node.js backend. Login, signup, contact submission, and order lookup require the Node server to be deployed on a Node-capable hosting service and the frontend API configuration to match that deployment.
