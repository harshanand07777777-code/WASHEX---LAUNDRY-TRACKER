const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const dataFile = path.join(DATA_DIR, "contact-messages.json");
const signupDataFile = path.join(DATA_DIR, "signup-users.json");
const ordersDataFile = path.join(DATA_DIR, "orders.json");
const sessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of [dataFile, signupDataFile, ordersDataFile]) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]\n", "utf8");
}

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
}

const MAX_BODY_BYTES = 16 * 1024;

function readFormBody(req) {
    return new Promise((resolve, reject) => {
        const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
        if (contentType !== "application/x-www-form-urlencoded") {
            const error = new Error("Content-Type must be application/x-www-form-urlencoded.");
            error.statusCode = 415;
            return reject(error);
        }

        let body = "";
        let size = 0;
        let tooLarge = false;
        req.on("data", chunk => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                tooLarge = true;
                body = "";
                return;
            }
            if (!tooLarge) body += chunk.toString("utf8");
        });
        req.on("end", () => {
            if (tooLarge) {
                reject(Object.assign(new Error("Form submission is too large."), { statusCode: 413 }));
                return;
            }
            resolve(new URLSearchParams(body));
        });
        req.on("error", reject);
    });
}

function getSingleField(form, name) {
    const values = form.getAll(name);
    if (values.length > 1) throw Object.assign(new Error(`Field '${name}' must appear only once.`), { statusCode: 400 });
    return (values[0] || "").trim();
}

function validateAllowedFields(form, allowed) {
    for (const key of new Set(Array.from(form.keys()))) {
        if (!allowed.has(key)) throw Object.assign(new Error(`Unexpected form field: ${key}.`), { statusCode: 400 });
        if (form.getAll(key).length > 1) throw Object.assign(new Error(`Field '${key}' must appear only once.`), { statusCode: 400 });
    }
}

function isValidEmail(email) {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isValidName(name) {
    return name.length >= 2 && name.length <= 80 && /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name);
}

function validationError(message) {
    return Object.assign(new Error(message), { statusCode: 400 });
}

function readArray(file) {
    try {
        const value = JSON.parse(fs.readFileSync(file, "utf8"));
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

// Serialize read-modify-write operations per data file. Each update reads the
// latest contents only after the previous update has completed, then writes
// through a temporary file and atomic rename to avoid partial JSON files.
const dataWriteQueues = new Map();

function updateArray(file, updater) {
    const previous = dataWriteQueues.get(file) || Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
        const records = readArray(file);
        const result = await updater(records);
        const temporaryFile = `${file}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
        try {
            await fs.promises.writeFile(temporaryFile, JSON.stringify(records, null, 2) + "\n", "utf8");
            await fs.promises.rename(temporaryFile, file);
        } catch (error) {
            await fs.promises.rm(temporaryFile, { force: true }).catch(() => {});
            throw error;
        }
        return result;
    });
    dataWriteQueues.set(file, current);
    return current.finally(() => {
        if (dataWriteQueues.get(file) === current) dataWriteQueues.delete(file);
    });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return { passwordSalt: salt, passwordHash: hash };
}

function verifyPassword(password, user) {
    if (!user || typeof user.passwordSalt !== "string" || typeof user.passwordHash !== "string") return false;
    try {
        const actual = crypto.scryptSync(password, user.passwordSalt, 64);
        const expected = Buffer.from(user.passwordHash, "hex");
        return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}

function getSession(req) {
    const cookieHeader = String(req.headers.cookie || "");
    const match = cookieHeader.match(/(?:^|;\s*)washex_session=([a-f0-9]{64})(?:;|$)/);
    if (!match) return null;
    const session = sessions.get(match[1]);
    if (!session || session.expiresAt <= Date.now()) {
        sessions.delete(match[1]);
        return null;
    }
    return session;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

// Log unexpected rejected promises without allowing Node to terminate the server.
process.on("unhandledRejection", reason => {
    console.error("Unhandled promise rejection:", reason);
});

// In-memory, per-IP/per-route fixed-window rate limiting for write endpoints.
// Limits reset automatically after the window; no client-supplied identity is trusted.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const POST_RATE_LIMITS = {
    "/login": 10,
    "/signup": 10,
    "/contact": 10,
    "/track-order": 30
};
const rateLimitBuckets = new Map();

function getClientAddress(req) {
    return String(req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "");
}

function checkPostRateLimit(req, res, pathname) {
    const limit = POST_RATE_LIMITS[pathname];
    if (!limit) return true;

    const now = Date.now();
    const key = `${getClientAddress(req)}:${pathname}`;
    let bucket = rateLimitBuckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
        rateLimitBuckets.set(key, bucket);
    }

    if (bucket.count >= limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        res.setHeader("Retry-After", String(retryAfterSeconds));
        sendJson(res, 429, { message: "Too many requests. Please wait before trying again." });
        return false;
    }

    bucket.count += 1;
    return true;
}

// Periodically discard expired buckets so the limiter does not grow indefinitely.
const rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateLimitBuckets) {
        if (now >= bucket.resetAt) rateLimitBuckets.delete(key);
    }
}, RATE_LIMIT_WINDOW_MS);
rateLimitCleanup.unref();

const server = http.createServer(async (req, res) => {
    let url;
    try {
        url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    } catch {
        return sendJson(res, 400, { message: "Invalid request URL." });
    }

    if (req.method === "POST" && POST_RATE_LIMITS[url.pathname] && !checkPostRateLimit(req, res, url.pathname)) {
        return;
    }

    if (req.method === "GET" && url.pathname === "/session") {
        const session = getSession(req);
        if (!session) return sendJson(res, 200, { authenticated: false });
        return sendJson(res, 200, { authenticated: true, user: { fullName: session.user.fullName, email: session.user.email } });
    }

    if (req.method === "POST" && url.pathname === "/login") {
        try {
            const form = await readFormBody(req);
            validateAllowedFields(form, new Set(["email", "password", "remember"]));
            const email = getSingleField(form, "email").toLowerCase();
            const password = getSingleField(form, "password");
            if (!email || !password) throw validationError("Please enter both email and password.");
            if (!isValidEmail(email)) throw validationError("Enter a valid email address.");
            if (password.length > 128) throw validationError("Invalid email or password.");

            const users = readArray(signupDataFile);
            const user = users.find(item => String(item.email || "").toLowerCase() === email);
            if (!user || !verifyPassword(password, user)) {
                return sendJson(res, 401, { message: "Invalid email or password." });
            }
            const token = crypto.randomBytes(32).toString("hex");
            sessions.set(token, {
                user: { fullName: user.fullName, email: user.email },
                expiresAt: Date.now() + SESSION_TTL_MS
            });
            res.setHeader("Set-Cookie", `washex_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
            return sendJson(res, 200, {
                message: "Login successful.",
                redirect: "TrackPage.html"
            });
        } catch (error) {
            if (res.headersSent || res.destroyed) return;
            if (error.statusCode) return sendJson(res, error.statusCode, { message: error.message });
            console.error("Login error:", error);
            return sendJson(res, 500, { message: "Could not process login. Please try again." });
        }
    }

    if (req.method === "POST" && url.pathname === "/signup") {
        try {
            const form = await readFormBody(req);
            validateAllowedFields(form, new Set(["fullname", "email", "phone", "password", "confirm-password", "terms"]));
            const user = {
                fullName: getSingleField(form, "fullname"),
                email: getSingleField(form, "email").toLowerCase(),
                phone: getSingleField(form, "phone"),
                registeredAt: new Date().toISOString()
            };
            const password = getSingleField(form, "password");
            const confirmPassword = form.get("confirm-password") || "";
            const terms = form.get("terms");

            if (!user.fullName || !user.email || !user.phone || !password || !confirmPassword) {
                throw validationError("Please complete all required fields.");
            }
            if (!isValidName(user.fullName)) throw validationError("Enter a valid name (2–80 letters; spaces, apostrophes, periods and hyphens are allowed).");
            if (!isValidEmail(user.email)) throw validationError("Enter a valid email address.");
            if (!/^\+?[0-9 ()-]{7,20}$/.test(user.phone) || user.phone.replace(/\D/g, "").length < 7 || user.phone.replace(/\D/g, "").length > 15) {
                throw validationError("Enter a valid phone number.");
            }
            if (password.length < 8 || password.length > 128) throw validationError("Password must be between 8 and 128 characters.");
            if (password !== confirmPassword) throw validationError("Passwords do not match.");
            if (terms !== "on") throw validationError("You must accept the Terms of Service and Campus Laundry Guidelines.");

            Object.assign(user, hashPassword(password));
            const created = await updateArray(signupDataFile, users => {
                if (users.some(item => String(item.email).toLowerCase() === user.email)) return false;
                users.push(user);
                return true;
            });
            if (!created) return sendJson(res, 409, { message: "An account with this email already exists." });
            return sendJson(res, 201, {
                message: "Your account was created successfully. Please log in to continue.",
                redirect: "Login.html"
            });
        } catch (error) {
            if (res.headersSent || res.destroyed) return;
            if (error.statusCode) return sendJson(res, error.statusCode, { message: error.message });
            console.error("Signup error:", error);
            return sendJson(res, 500, { message: "Could not save Sign Up details." });
        }
    }

    if (req.method === "POST" && url.pathname === "/track-order") {
        try {
            const form = await readFormBody(req);
            validateAllowedFields(form, new Set(["laundry-number"]));
            const orderId = getSingleField(form, "laundry-number").toUpperCase();
            if (!/^WX-[0-9]{5}$/.test(orderId)) {
                throw validationError("Enter a valid laundry number in the format WX-12345 (WX- followed by exactly 5 digits).");
            }

            const orders = readArray(ordersDataFile);
            const order = orders.find(item => String(item.orderId || "").toUpperCase() === orderId);
            if (!order) return sendJson(res, 404, { message: "No laundry order was found for that number. Check the number and try again." });

            return sendJson(res, 200, {
                order: {
                    orderId: order.orderId,
                    customerName: order.customerName,
                    serviceType: order.serviceType,
                    dateSubmitted: order.dateSubmitted,
                    intakeDesk: order.intakeDesk,
                    verifiedWeight: order.verifiedWeight,
                    expectedCollection: order.expectedCollection,
                    collectionLocation: order.collectionLocation,
                    currentStatus: order.currentStatus,
                    estimatedCompletion: order.estimatedCompletion,
                    dateSubmittedAt: order.dateSubmittedAt,
                    washingCompletedAt: order.washingCompletedAt,
                    ironingStartedAt: order.ironingStartedAt,
                    expectedCollectionAt: order.expectedCollectionAt,
                    lastUpdatedAt: order.lastUpdatedAt,
                    estimatedCompletionAt: order.estimatedCompletionAt
                }
            });
        } catch (error) {
            if (res.headersSent || res.destroyed) return;
            if (error.statusCode) return sendJson(res, error.statusCode, { message: error.message });
            console.error("Tracking lookup error:", error);
            return sendJson(res, 500, { message: "Could not look up this order. Please try again." });
        }
    }

    if (req.method === "POST" && url.pathname === "/contact") {
        try {
            const form = await readFormBody(req);
            validateAllowedFields(form, new Set(["full-name", "email", "order-id", "message"]));
            const message = {
                name: getSingleField(form, "full-name"),
                email: getSingleField(form, "email").toLowerCase(),
                orderId: getSingleField(form, "order-id"),
                message: getSingleField(form, "message"),
                submittedAt: new Date().toISOString()
            };
            if (!message.name || !message.email || !message.message) throw validationError("Please fill in all required fields.");
            if (!isValidName(message.name)) throw validationError("Enter a valid name (2–80 letters; spaces, apostrophes, periods and hyphens are allowed).");
            if (!isValidEmail(message.email)) throw validationError("Enter a valid email address.");
            if (message.orderId.length > 40 || (message.orderId && !/^[A-Za-z0-9_-]+$/.test(message.orderId))) {
                throw validationError("Enter a valid Order ID (letters, numbers, hyphens and underscores only; up to 40 characters).");
            }
            if (message.message.length < 5 || message.message.length > 2000) throw validationError("Message must be between 5 and 2,000 characters.");

            await updateArray(dataFile, messages => {
                messages.push(message);
            });
            return sendJson(res, 200, { message: `Thank you, ${message.name}! Your message has been saved successfully.` });
        } catch (error) {
            if (res.headersSent || res.destroyed) return;
            if (error.statusCode) return sendJson(res, error.statusCode, { message: error.message });
            console.error("Contact error:", error);
            return sendJson(res, 500, { message: "Could not save your message. Please try again." });
        }
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        return sendJson(res, 404, { message: "Route not found." });
    }

    let requestPath;
    try {
        requestPath = decodeURIComponent(url.pathname);
    } catch (error) {
        console.warn("Rejected malformed URL path:", url.pathname);
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Bad Request: malformed URL path");
    }
    if (requestPath === "/") requestPath = "/pages/index.html";
    // Browsers request the favicon from the site root by default. Map that
    // request to the public icon asset without exposing other root files.
    if (requestPath === "/favicon.ico") requestPath = "/assets/favicon.ico";

    // Only explicitly public folders are served. Server code, data files,
    // project documentation, dotfiles, and unknown root paths stay private.
    const publicRoots = ["pages", "styles", "scripts", "assets"];
    const segments = requestPath.split("/").filter(Boolean);
    if (segments.some(segment => segment === "." || segment === ".." || segment.startsWith("."))) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Forbidden");
    }

    let filePath;
    if (requestPath.endsWith(".html") && !publicRoots.some(root => requestPath.startsWith(`/${root}/`))) {
        // Keep the site's short page URLs working without exposing the project root.
        filePath = path.join(ROOT, "pages", path.basename(requestPath));
    } else {
        const publicRoot = publicRoots.find(root => requestPath === `/${root}` || requestPath.startsWith(`/${root}/`));
        if (!publicRoot) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("Not found");
        }
        filePath = path.resolve(ROOT, `.${requestPath}`);
        const allowedDirectory = path.resolve(ROOT, publicRoot) + path.sep;
        if (!filePath.startsWith(allowedDirectory)) {
            res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("Forbidden");
        }
    }

    const normalized = path.resolve(filePath);
    const pagesDirectory = path.resolve(ROOT, "pages") + path.sep;
    const isPageAlias = requestPath.endsWith(".html") && !publicRoots.some(root => requestPath.startsWith(`/${root}/`));
    if (isPageAlias && !normalized.startsWith(pagesDirectory)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Forbidden");
    }

    fs.stat(normalized, (error, stats) => {
        if (error || !stats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("Not found");
        }
        const contentType = MIME_TYPES[path.extname(normalized).toLowerCase()] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        if (req.method === "HEAD") return res.end();
        fs.createReadStream(normalized).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`Washex is running at http://localhost:${PORT}`);
});
