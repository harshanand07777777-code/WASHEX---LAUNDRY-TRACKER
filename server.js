const express = require("express");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs"); // <-- FOR PARAMETER 3 NEW LINE
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "washex";

const sessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

let db, users, orders, contacts;

// --- Authentication Helpers ---
const validEmail = value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const validName = value => value.length >= 2 && value.length <= 80 && /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(value);

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    return { passwordSalt: salt, passwordHash: crypto.scryptSync(password, salt, 64).toString("hex") };
}

function verifyPassword(password, user) {
    try {
        if (!user?.passwordSalt || !user?.passwordHash) return false;
        const actual = crypto.scryptSync(password, user.passwordSalt, 64);
        const expected = Buffer.from(user.passwordHash, "hex");
        return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
    } catch { return false; }
}

function getSession(req) {
    const match = String(req.headers.cookie || "").match(/(?:^|;\s*)washex_session=([a-f0-9]{64})(?:;|$)/);
    if (!match) return null;
    const session = sessions.get(match[1]);
    if (!session || session.expiresAt <= Date.now()) { sessions.delete(match[1]); return null; }
    return session;
}

// Middleware to check if user is logged in
function requireSession(req, res, next) {
    const session = getSession(req);
    if (!session) return res.status(401).json({ message: "Please log in to continue." });
    req.session = session;
    next();
}

// --- EXPRESS MIDDLEWARE ---
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// --- CRUD APIs FOR MONGODB ---

// 1. READ: Check Session
app.get("/session", (req, res) => {
    const session = getSession(req);
    res.status(200).json(session ? { authenticated: true, user: session.user } : { authenticated: false });
});

// 2. CREATE: Signup User
app.post("/signup", async (req, res) => {
    try {
        const { fullname, email, phone, password, "confirm-password": confirmPassword } = req.body;
        const user = { fullName: fullname, email: email.toLowerCase(), phone, registeredAt: new Date().toISOString() };
        Object.assign(user, hashPassword(password));
        
        await users.insertOne(user);
        res.status(201).json({ message: "Account created successfully. Please log in.", redirect: "Login.html" });
    } catch (e) {
        if (e.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
        res.status(500).json({ message: "Could not save sign up details." });
    }
});

// 3. CREATE: Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await users.findOne({ email: email.toLowerCase() });
        if (!verifyPassword(password, user)) return res.status(401).json({ message: "Invalid email or password." });
        
        const token = crypto.randomBytes(32).toString("hex");
        sessions.set(token, { user: { fullName: user.fullName, email: user.email }, expiresAt: Date.now() + SESSION_TTL_MS });
        res.cookie("washex_session", token, { httpOnly: true, sameSite: "Lax", maxAge: SESSION_TTL_MS });
        res.status(200).json({ message: "Login successful.", redirect: "TrackPage.html" });
    } catch (e) {
        res.status(500).json({ message: "Could not process login." });
    }
});

// 4. CREATE: Place New Laundry Order
app.post("/orders", requireSession, async (req, res) => {
    try {
        const { "service-type": serviceType, "order-notes": notes } = req.body;
        const orderId = `WX-${crypto.randomInt(10000, 100000)}`;
        const now = new Date();
        const order = {
            orderId, ownerEmail: req.session.user.email, customerName: req.session.user.fullName,
            serviceType, notes, dateSubmitted: now.toLocaleString("en-IN"), dateSubmittedAt: now.toISOString(),
            currentStatus: "Order received", intakeDesk: "Campus Laundry Desk", verifiedWeight: "Pending",
            expectedCollection: "To be confirmed", collectionLocation: "Campus Collection Desk",
            estimatedCompletion: "To be confirmed", lastUpdatedAt: now.toISOString(), createdAt: now, isDemo: false
        };
        await orders.insertOne(order);
        res.status(201).json({ message: "Your laundry order was placed successfully.", orderId });
    } catch (e) {
        res.status(500).json({ message: "Could not create your laundry order." });
    }
});

// 5. READ: Track Specific Order
app.post("/track-order", requireSession, async (req, res) => {
    try {
        const orderId = (req.body["laundry-number"] || "").toUpperCase();
        const order = await orders.findOne({ orderId, $or: [{ ownerEmail: req.session.user.email }, { isDemo: true }] });
        if (!order) return res.status(404).json({ message: "No order was found." });
        res.status(200).json({ order });
    } catch (e) {
        res.status(500).json({ message: "Could not look up this order." });
    }
});

// 6. UPDATE: Change Order Status (Added for CRUD requirements)
app.post("/update-order", requireSession, async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;
        const updateData = { currentStatus: newStatus, lastUpdatedAt: new Date().toISOString() };
        
        // Add timeline dates dynamically when status changes
        if (newStatus === "Washing") updateData.washingCompletedAt = new Date().toISOString();
        if (newStatus === "Ironing") updateData.ironingStartedAt = new Date().toISOString();
        
        const result = await orders.updateOne({ orderId, ownerEmail: req.session.user.email }, { $set: updateData });
        if (result.matchedCount === 0) return res.status(404).json({ message: "Order not found." });
        res.status(200).json({ message: "Order updated successfully!" });
    } catch (e) {
        res.status(500).json({ message: "Could not update order." });
    }
});

// 7. DELETE: Cancel Order (Added for CRUD requirements)
app.post("/delete-order", requireSession, async (req, res) => {
    try {
        const { orderId } = req.body;
        const result = await orders.deleteOne({ orderId, ownerEmail: req.session.user.email });
        if (result.deletedCount === 0) return res.status(404).json({ message: "Order not found." });
        res.status(200).json({ message: "Order deleted successfully!" });
    } catch (e) {
        res.status(500).json({ message: "Could not delete order." });
    }
});

// CREATE: Contact Message
app.post("/contact", async (req, res) => {
    try {
        const { "full-name": name, email, "order-id": orderId, message } = req.body;
        await contacts.insertOne({ name, email: email.toLowerCase(), orderId, message, submittedAt: new Date().toISOString() });
        res.status(200).json({ message: "Message saved successfully." });
    } catch (e) {
        res.status(500).json({ message: "Could not save your message." });
    }
});

// --- PARAMETER 3: Save/Fetch data to local JSON files ---
app.get("/export-json", async (req, res) => {
    try {
        // Fetch data from MongoDB
        const allOrders = await orders.find({}).toArray();
        
        // Save to a local JSON file (Create/Save)
        const filePath = path.join(__dirname, "local-backup.json");
        fs.writeFileSync(filePath, JSON.stringify(allOrders, null, 2));

        // Read from the local JSON file (Fetch)
        const savedData = fs.readFileSync(filePath, "utf8");
        
        res.status(200).json({ 
            message: "Successfully saved and fetched from local JSON file!", 
            data: JSON.parse(savedData) 
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to process JSON file." });
    }
});

// --- EXPRESS STATIC FILE ROUTING ---
app.use("/pages", express.static(path.join(ROOT, "pages")));
app.use("/styles", express.static(path.join(ROOT, "styles")));
app.use("/scripts", express.static(path.join(ROOT, "scripts")));
app.use("/assets", express.static(path.join(ROOT, "assets")));
app.use("/images", express.static(path.join(ROOT, "images")));

app.get("/", (req, res) => res.sendFile(path.join(ROOT, "pages", "index.html")));
app.get("/:page", (req, res) => {
    if (req.params.page.endsWith(".html")) {
        res.sendFile(path.join(ROOT, "pages", req.params.page));
    } else {
        res.status(404).send("Not found");
    }
});

// --- SERVER STARTUP ---
async function start() {
    if (!MONGO_URI) {
        console.error("MONGODB_URI is missing.");
        process.exit(1);
    }
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    users = db.collection("users");
    orders = db.collection("orders");
    contacts = db.collection("contactMessages");

    app.listen(PORT, () => console.log(`WASHEX Express Server connected to MongoDB and running at http://localhost:${PORT}`));
}
start().catch(console.error);