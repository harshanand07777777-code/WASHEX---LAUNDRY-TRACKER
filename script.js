const contactForm = document.getElementById("contactForm");

if (contactForm) {
    contactForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const fullName = document.getElementById("full-name").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();

        if (fullName === "" || email === "" || message === "") {
            alert("Please fill in all required fields.");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/contact", {
                method: "POST",
                body: new URLSearchParams(new FormData(contactForm))
            });

            const result = await response.text();

            if (response.ok) {
                alert("Thank you, " + fullName + "! Your message has been saved successfully.");
                contactForm.reset();
            } else {
                alert("Could not submit your message: " + result);
            }
        } catch (error) {
            alert("Could not connect to the Washex server. Make sure server.js is running.");
            console.error(error);
        }
    });
}

//SignUp Form

const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const fullName = document.getElementById("fullname").value.trim();
        const password = document.getElementById("signup-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (fullName === "") {
            alert("Please enter your full name.");
            return;
        }

        if (password.length < 8) {
            alert("Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match. Please try again.");
            return;
        }

        try {
            const response = await fetch("http://localhost:3000/signup", {
                method: "POST",
                body: new URLSearchParams(new FormData(signupForm))
            });

            const result = await response.json();

            if (response.ok) {
                alert("Thank you, " + fullName + "! " + result.message);
                signupForm.reset();
            } else {
                alert(result.message || "Could not save Sign Up details.");
            }

        } catch (error) {
            alert("Could not connect to the Washex server. Make sure server.js is running.");
            console.error(error);
        }
    });
}

// LoginForm


const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (email === "" || password === "") {
            alert("Please enter both email and password.");
            return;
        }

        if (password.length < 8) {
            alert("Password must contain at least 8 characters.");
            return;
        }

        window.location.href = "LaundryStatus.html";
    });
}