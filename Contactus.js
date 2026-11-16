
const contactForm = document.getElementById("contactForm");

if (contactForm) {
    contactForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const fullName = document.getElementById("full-name").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();
        const submitButton = contactForm.querySelector('button[type="submit"]');

        if (fullName === "" || email === "" || message === "") {
            showFormMessage(contactForm, "Please fill in all required fields.");
            return;
        }

        // The form's action attribute is the single source of truth for its API route.
        // This avoids a separate hardcoded URL in the client-side script.
        const endpoint = contactForm.action;
        if (!endpoint) {
            showFormMessage(contactForm, "The contact form endpoint is not configured.");
            return;
        }

        if (submitButton) submitButton.disabled = true;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: new URLSearchParams(new FormData(contactForm))
            });

            const result = await readApiResponse(response);

            if (response.ok) {
                contactForm.reset();
                showFormMessage(contactForm, result.message || ("Thank you, " + fullName + "! Your message has been saved successfully."), "success");
            } else {
                showFormMessage(contactForm, result.message || "Could not submit your message. Please try again.");
            }
        } catch (error) {
            showFormMessage(contactForm, error.message || "Could not connect to the Washex server. Make sure server.js is running.");
            console.error(error);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}
