// Mohit — Sign Up page

//SignUp Form

const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const fullName = document.getElementById("fullname").value.trim();
        const password = document.getElementById("signup-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (fullName === "") {
            showFormMessage(signupForm, "Please enter your full name.");
            return;
        }

        if (password.length < 8) {
            showFormMessage(signupForm, "Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            showFormMessage(signupForm, "Passwords do not match. Please try again.");
            return;
        }

        try {
            const response = await fetch("/signup", {
                method: "POST",
                body: new URLSearchParams(new FormData(signupForm))
            });

            const result = await readApiResponse(response);

            if (response.ok && result.redirect === "Login.html") {
                showFormMessage(signupForm, result.message || "Your account was created. Redirecting to login...", "success");
                window.location.href = result.redirect;
            } else if (response.ok) {
                showFormMessage(signupForm, "Your account was created, but the server returned an invalid redirect destination.");
            } else {
                showFormMessage(signupForm, result.message || "Could not save Sign Up details.");
            }

        } catch (error) {
            showFormMessage(signupForm, error.message || "Could not connect to the Washex server. Make sure server.js is running.");
            console.error(error);
        }
    });
}
