// Sign Up page: validate in the browser, then create the account on the server.
document.addEventListener("DOMContentLoaded", function () {
    Washex.markActiveNav();

    const form = document.getElementById("signupForm");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        Washex.clearMessage(form);

        const fullName = document.getElementById("fullname").value.trim();
        const password = document.getElementById("signup-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (fullName === "") {
            Washex.showMessage(form, "Please enter your full name.", "error");
            return;
        }
        if (password.length < 8) {
            Washex.showMessage(form, "Password must contain at least 8 characters.", "error");
            return;
        }
        if (password !== confirmPassword) {
            Washex.showMessage(form, "Passwords do not match. Please try again.", "error");
            return;
        }

        Washex.setBusy(form, true);
        try {
            const { ok, result } = await Washex.postForm("/signup", form);
            if (!ok) {
                Washex.showMessage(form, result.message || "Could not create your account.", "error");
                Washex.setBusy(form, false);
                return;
            }
            form.reset();
            Washex.showMessage(
                form,
                "Thank you, " + fullName + "! " + (result.message || "Your account was created."),
                "success"
            );
            // Keep the button disabled while we send the user on to the login page.
            setTimeout(function () {
                window.location.href = result.redirect || "Login.html";
            }, 1500);
        } catch (error) {
            console.error(error);
            Washex.showMessage(form, Washex.CONNECTION_ERROR, "error");
            Washex.setBusy(form, false);
        }
    });
});
