# Washex

Campus laundry website: sign up, log in, track a laundry order, and contact the helpdesk.

## Project structure

- `pages/` — HTML pages (`index`, `Services`, `About`, `ContactUs`, `Login`, `SignUp`, `TrackPage`, `LaundryStatus`)
- `styles/` — CSS (one file per page group, plus shared `common.css`)
- `scripts/` — frontend JavaScript (one file per page, plus shared `common.js`; `index.js` and `about.js` just highlight the current nav link)
- `assets/` — `favicon.ico` and `images/` (`washing-machine.jpeg` and `campus-lockers.jpeg` are **placeholders** — replace them with your own photos, keeping the same filenames)
- `data/` — local JSON files used by the demo backend (`orders.json` holds the sample orders)
- `server.js` — Node.js web server and form API

## Run locally

1. Install Node.js (no third-party packages are required).
2. Open a terminal in this project folder and run:

   ```bash
   node server.js
   ```

3. Open **http://localhost:3000** in your browser.

> Always use that address. Opening an HTML file by double-clicking it, or through VS Code Live Server,
> serves the page without the backend, so login, signup, contact and tracking will show
> "Could not connect to the Washex server".

If port 3000 is busy: `PORT=3001 node server.js` (Windows PowerShell: `$env:PORT=3001; node server.js`).

## Demo data

Track these laundry numbers on the Track page:

| Number | Customer | Stage |
|---|---|---|
| `WX-10025` | Rahul Sharma | Ironing |
| `WX-10026` | Priya Verma | Washing & Drying |
| `WX-10027` | Aman Singh | Ready for Collection |
| `WX-10028` | Neha Gupta | Collected |
| `WX-10029` | Karan Mehta | Clothes Submitted |

Accounts and contact messages are created at runtime in `data/signup-users.json` and
`data/contact-messages.json` (ignored by git).

## How the pages connect

`SignUp` → `Login` → `TrackPage` (enter a number) → `LaundryStatus?orderId=WX-xxxxx` (full timeline).
Scripts talk to the server with relative URLs (`/login`, `/signup`, `/contact`, `/track-order`, `/session`).

## Notes

This is a development prototype. Passwords are hashed and sessions use an HttpOnly cookie, but sessions live in
memory (they reset when the server restarts) and JSON files are for local demonstration only. A real deployment
needs a database, HTTPS, and a way to create/update orders (currently edit `data/orders.json`).

## Team collaboration

See [TEAM_GITHUB_WORKFLOW.md](TEAM_GITHUB_WORKFLOW.md) for branch ownership, JavaScript file assignments, and merge instructions.
