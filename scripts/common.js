// Shared helpers used by the page-specific form scripts.

// Read API responses safely. A server/proxy error page or malformed JSON must
// never cause an uncaught JSON.parse error in a form handler.
async function readApiResponse(response) {
    const responseText = await response.text();
    if (!responseText.trim()) {
        throw new Error("The server returned an empty response. Please try again.");
    }

    let result;
    try {
        result = JSON.parse(responseText);
    } catch {
        throw new Error("The server returned an invalid response. Please try again.");
    }

    if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The server returned an unexpected response. Please try again.");
    }
    return result;
}


// Render server feedback inline so users can read the actual response without
// dismissing browser alert dialogs.
function showFormMessage(form, message, type = "error") {
    let messageBox = form.querySelector(".form-server-message");
    if (!messageBox) {
        messageBox = document.createElement("div");
        messageBox.className = "form-server-message";
        messageBox.setAttribute("role", "status");
        messageBox.setAttribute("aria-live", "polite");
        form.appendChild(messageBox);
    }
    messageBox.textContent = message;
    messageBox.classList.remove("is-success", "is-error");
    messageBox.classList.add(type === "success" ? "is-success" : "is-error");
}
