// Mohit — Login page

// Login form: credentials are verified by the server before redirecting.
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: new URLSearchParams(new FormData(loginForm))
            });
            const result = await readApiResponse(response);

            if (response.ok && result.redirect) {
                window.location.href = result.redirect;
            } else {
                showFormMessage(loginForm, result.message || "Invalid email or password.");
            }
        } catch (error) {
            showFormMessage(loginForm, error.message || "Could not connect to the Washex server. Make sure server.js is running.");
            console.error(error);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}
