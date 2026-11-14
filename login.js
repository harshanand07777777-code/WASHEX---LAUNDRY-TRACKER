// Login page: send credentials to the server, which sets the session cookie.
document.addEventListener("DOMContentLoaded", function () {
    Washex.markActiveNav();

    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        Washex.clearMessage(form);

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (email === "" || password === "") {
            Washex.showMessage(form, "Please enter both email and password.", "error");
            return;
        }

        Washex.setBusy(form, true);
        try {
            const { ok, result } = await Washex.postForm("/login", form);
            if (!ok) {
                Washex.showMessage(form, result.message || "Login failed. Please try again.", "error");
                return;
            }
            Washex.showMessage(form, result.message || "Login successful.", "success");
            window.location.href = result.redirect || "TrackPage.html";
        } catch (error) {
            console.error(error);
            Washex.showMessage(form, Washex.CONNECTION_ERROR, "error");
        } finally {
            Washex.setBusy(form, false);
        }
    });
});
