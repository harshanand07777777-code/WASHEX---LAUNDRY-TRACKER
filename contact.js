// Contact Us page: save the message through the server.
document.addEventListener("DOMContentLoaded", function () {
    Washex.markActiveNav();

    const form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        Washex.clearMessage(form);

        const fullName = document.getElementById("full-name").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();

        if (fullName === "" || email === "" || message === "") {
            Washex.showMessage(form, "Please fill in all required fields.", "error");
            return;
        }

        Washex.setBusy(form, true);
        try {
            const { ok, result } = await Washex.postForm("/contact", form);
            if (!ok) {
                Washex.showMessage(form, result.message || "Could not submit your message.", "error");
                return;
            }
            Washex.showMessage(
                form,
                result.message || "Thank you, " + fullName + "! Your message has been saved successfully.",
                "success"
            );
            form.reset();
        } catch (error) {
            console.error(error);
            Washex.showMessage(form, Washex.CONNECTION_ERROR, "error");
        } finally {
            Washex.setBusy(form, false);
        }
    });
});
