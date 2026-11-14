// Shared helpers used by every Washex page script.
// Load this file BEFORE the page's own script:
//   <script src="/scripts/common.js"></script>
//   <script src="/scripts/<page>.js"></script>
//
// Exposes two globals (everything else stays private to this file):
//   Washex            - form / navigation helpers
//   readApiResponse() - safely turns a fetch Response into a plain object
(function () {
    "use strict";

    // Where the Washex Node server lives.
    //  - Served by the Node server itself (or deployed behind a normal URL): same origin, so "".
    //  - Opened from VS Code Live Server (e.g. 127.0.0.1:5500) or straight from disk (file://):
    //    those cannot handle POST requests, so API calls go to the Node server on port 3000.
    //  Override with <script>window.WASHEX_API_BASE = "https://your-server"</script> if needed.
    function apiBase() {
        if (typeof window.WASHEX_API_BASE === "string") return window.WASHEX_API_BASE;
        var loc = window.location;
        if (loc.protocol === "file:") return "http://localhost:3000";
        var isLocal = loc.hostname === "localhost" || loc.hostname === "127.0.0.1";
        if (isLocal && loc.port && loc.port !== "3000") return loc.protocol + "//" + loc.hostname + ":3000";
        return "";
    }

    function apiUrl(path) {
        return apiBase() + path;
    }

    function connectionError() {
        var address = apiBase() || window.location.origin;
        return "Could not connect to the Washex server at " + address + ". " +
            "Open a terminal in the project folder, run \"node server.js\", and keep it running. " +
            "Then check that " + address + "/session shows {\"authenticated\":false}.";
    }

    // Always resolves to an object, even when the server sends plain text or
    // nothing at all, so callers can safely read result.message / result.order.
    async function readApiResponse(response) {
        var text = "";
        try {
            text = await response.text();
        } catch (error) {
            return { message: connectionError() };
        }

        if (text) {
            try {
                var parsed = JSON.parse(text);
                if (parsed && typeof parsed === "object") return parsed;
            } catch (error) {
                // Not JSON (for example an HTML or plain-text error page): fall through.
            }
        }

        if (response.ok) return {};
        return {
            message: response.status === 404
                ? "That service could not be found on the server."
                : "The server returned an unexpected response (" + response.status + "). Please try again."
        };
    }

    // Highlight the link for the page being viewed in the header navigation.
    function markActiveNav() {
        var current = window.location.pathname.split("/").pop().toLowerCase();
        if (current === "") current = "index.html";

        document.querySelectorAll("header nav a").forEach(function (link) {
            var target = (link.getAttribute("href") || "").split(/[?#]/)[0].split("/").pop().toLowerCase();
            if (target === current) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    // ---------- Form messages ----------

    function clearMessage(form) {
        if (!form) return;
        form.querySelectorAll(".form-message").forEach(function (element) {
            element.remove();
        });
    }

    // type is "error" or "success". Text is inserted with textContent (never innerHTML).
    function showMessage(form, text, type) {
        if (!form) return;
        clearMessage(form);

        var box = document.createElement("div");
        box.className = "form-message " + (type === "success" ? "is-success" : "is-error");
        box.setAttribute("role", type === "success" ? "status" : "alert");
        box.textContent = text;
        form.insertBefore(box, form.firstChild);
    }

    // Disable the submit button while a request is running (prevents double submits).
    function setBusy(form, busy) {
        if (!form) return;
        form.setAttribute("aria-busy", busy ? "true" : "false");
        form.querySelectorAll('button[type="submit"]').forEach(function (button) {
            button.disabled = !!busy;
        });
    }

    // POST a form to the server as application/x-www-form-urlencoded.
    // Resolves to { ok, status, result } where result is always an object.
    async function postForm(url, form) {
        var response = await fetch(apiUrl(url), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: new URLSearchParams(new FormData(form))
        });
        var result = await readApiResponse(response);
        return { ok: response.ok, status: response.status, result: result };
    }

    window.readApiResponse = readApiResponse;
    window.Washex = {
        get CONNECTION_ERROR() { return connectionError(); },
        apiUrl: apiUrl,
        markActiveNav: markActiveNav,
        clearMessage: clearMessage,
        showMessage: showMessage,
        setBusy: setBusy,
        postForm: postForm
    };
})();
