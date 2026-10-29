
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const dataFile = path.join(__dirname, "contact-messages.json");
const signupDataFile = path.join(__dirname, "signup-users.json");

const allowedOrigin = "http://127.0.0.1:5500";


const server = http.createServer((req, res) => {
    
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    
    if (req.method === "POST" && req.url === "/signup") {
        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                const formData = new URLSearchParams(body);

                const newUser = {
                    fullName: (formData.get("fullname") || "").trim(),
                    email: (formData.get("email") || "").trim(),
                    phone: (formData.get("phone") || "").trim(),
                    registeredAt: new Date().toISOString()
                };

                if (!newUser.fullName || !newUser.email || !newUser.phone) {
                    res.writeHead(400, {
                        "Content-Type": "application/json"
                    });
                    res.end(JSON.stringify({
                        message: "Please complete all required fields."
                    }));
                    return;
                }

                let users = [];

                if (fs.existsSync(signupDataFile)) {
                    users = JSON.parse(
                        fs.readFileSync(signupDataFile, "utf8")
                    );
                }

                users.push(newUser);

                fs.writeFileSync(
                    signupDataFile,
                    JSON.stringify(users, null, 2),
                    "utf8"
                );

                res.writeHead(200, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    message: "Sign Up details saved successfully!"
                }));

            } catch (error) {
                console.error(error);

                res.writeHead(500, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    message: "Could not save Sign Up details."
                }));
            }
        });

        return;
    }


    if (req.method === "POST" && req.url === "/contact") {
        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                const formData = new URLSearchParams(body);

                const newMessage = {
                    name: (formData.get("full-name") || "").trim(),
                    email: (formData.get("email") || "").trim(),
                    orderId: (formData.get("order-id") || "").trim(),
                    message: (formData.get("message") || "").trim(),
                    submittedAt: new Date().toISOString()
                };

                if (!newMessage.name || !newMessage.email || !newMessage.message) {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    res.end("Please fill in all required fields.");
                    return;
                }

                let messages = [];

                if (fs.existsSync(dataFile)) {
                    messages = JSON.parse(fs.readFileSync(dataFile, "utf8"));
                }

                messages.push(newMessage);

                fs.writeFileSync(
                    dataFile,
                    JSON.stringify(messages, null, 2),
                    "utf8"
                );

                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(`
                    <h2>Thank you, ${escapeHtml(newMessage.name)}!</h2>
                    <p>Your message has been saved successfully.</p>
                    <p><a href="http://127.0.0.1:5500/ContactUs.html">Return to Washex</a></p>
                `);
            } catch (error) {
                console.error(error);
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end("Could not save your message. Please try again.");
            }
        });

        return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Route not found.");
});

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

server.listen(PORT, () => {
    console.log(`Washex server running at http://localhost:${PORT}`);
});
