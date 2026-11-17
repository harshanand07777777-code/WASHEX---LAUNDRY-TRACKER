# WASHEX — Laundry Tracker

WASHEX is a student-facing campus laundry demo. It uses Node.js and MongoDB Atlas.

## Features
- User signup and login (passwords are hashed with Node.js scrypt).
- MongoDB collections: `users`, `orders`, and `contactMessages`.
- Logged-in users can place laundry orders.
- Each new order receives a unique `WX-12345` number.
- Users can track their own orders. The sample `WX-10025` demo order remains available to logged-in users.
- Contact messages are saved in MongoDB.
- Existing JSON records are imported into MongoDB once when the corresponding collection is empty.

## 1. Install Node.js
Install the current Node.js LTS version.

## 2. Create a MongoDB Atlas database
1. Create a free MongoDB Atlas account at https://www.mongodb.com/atlas.
2. Create a free shared cluster and a database user (username and password).
3. In Network Access, add your current IP address. For a short classroom demo, Atlas also permits `0.0.0.0/0`, but it is less restrictive; remove it after the demo.
4. In your cluster, choose Connect → Drivers → Node.js and copy the connection string.
5. Replace the username and password placeholders in the connection string. If the password contains special characters, URL-encode them.

## 3. Configure the project
In this project folder, make a copy of `.env.example` named `.env`.
Put your Atlas connection string after `MONGODB_URI=`. Keep `MONGODB_DB=washex`.
Do not share or commit `.env`; it contains your database password.

Example (not a real connection string):
```env
MONGODB_URI=mongodb+srv://student:password@cluster0.example.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=washex
PORT=3000
```

## 4. Install packages and run
Open a terminal in this project folder:
```bash
npm install
npm start
```
Open http://localhost:3000. Do not use VS Code Live Server for this app.

## 5. Demo flow
1. Sign up with a new email and log in.
2. On Track Laundry, choose a service under Place a Laundry Order and submit.
3. Note the generated laundry number.
4. Enter that number in the Track Laundry form to see the order.
5. Try the sample number `WX-10025` to see the preloaded demo order.

## MongoDB collections
- `users`: account details and password hashes.
- `orders`: generated order number, service, status, and owner email.
- `contactMessages`: Contact Us submissions.

The server imports existing `data/*.json` records into MongoDB when the matching collection is empty. The JSON files are retained as a local migration source, but new writes are saved to MongoDB.

## Important
This is a classroom demonstration, not a production deployment. Sessions are held in memory and will reset when the server restarts. For a deployed website, use HTTPS, a persistent session store, stronger operational controls, and restrict Atlas network access.
