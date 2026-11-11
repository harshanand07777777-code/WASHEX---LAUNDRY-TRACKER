# Washex

Campus laundry website organized into separate folders.

## Project structure

- `pages/` — HTML pages
- `styles/` — CSS stylesheets
- `scripts/` — frontend JavaScript
- `assets/images/` — image assets
- `data/` — local JSON data files used by the demo backend
- `server.js` — Node.js web server and form API

## Run locally

1. Install Node.js (no third-party packages are required).
2. Open a terminal in this project folder.
3. Run:

   ```bash
   node server.js
   ```

4. Open `http://localhost:3000` in your browser.

The server serves the homepage at `/` and all pages, styles, scripts and images from their organized locations.

## Notes

This is a reorganized development prototype. Signup currently stores basic profile details only; it is not secure account authentication. The login and laundry tracking interfaces still need real authentication and database-backed order tracking before production use. JSON files are intended for local demonstration only.

## Team collaboration

See [TEAM_GITHUB_WORKFLOW.md](TEAM_GITHUB_WORKFLOW.md) for branch ownership, JavaScript file assignments, and merge instructions.
