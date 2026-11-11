// Arun — Track Laundry page

// Laundry tracking: look up the submitted ID in the server's order records.
const trackingForm = document.getElementById("trackingForm");
const trackingResult = document.getElementById("trackingResult");

if (trackingForm && trackingResult) {
    const trackingNumberInput = trackingForm.querySelector("[name=\"laundry-number\"]");
    if (trackingNumberInput) {
        trackingNumberInput.addEventListener("input", function() {
            this.value = this.value.toUpperCase().replace(/\s+/g, "");
        });
    }

    trackingForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        const submitButton = trackingForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        trackingResult.hidden = false;
        trackingResult.textContent = "Looking up your laundry order…";
        trackingResult.className = "tracking-result";

        try {
            const response = await fetch("/track-order", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: new URLSearchParams(new FormData(trackingForm))
            });
            const result = await readApiResponse(response);
            if (!response.ok) throw new Error(result.message || "Order lookup failed.");

            const order = result.order;
            trackingResult.replaceChildren();
            const heading = document.createElement("h2");
            heading.textContent = `Order ${order.orderId}`;
            const status = document.createElement("p");
            status.className = "tracking-result-status";
            status.textContent = `Current status: ${order.currentStatus}`;
            const details = document.createElement("dl");
            const fields = [
                ["Customer", order.customerName],
                ["Service", order.serviceType],
                ["Date submitted", order.dateSubmitted],
                ["Intake desk", order.intakeDesk],
                ["Verified weight", order.verifiedWeight],
                ["Expected collection", order.expectedCollection],
                ["Collection location", order.collectionLocation],
                ["Estimated completion", order.estimatedCompletion]
            ];
            fields.forEach(([label, value]) => {
                const term = document.createElement("dt");
                term.textContent = label;
                const description = document.createElement("dd");
                description.textContent = value || "Not available";
                details.append(term, description);
            });
            const statusLink = document.createElement("a");
            statusLink.href = `LaundryStatus.html?orderId=${encodeURIComponent(order.orderId)}`;
            statusLink.textContent = "View full order status";
            statusLink.className = "tracking-status-link";
            trackingResult.append(heading, status, details, statusLink);
            trackingResult.classList.add("is-success");
        } catch (error) {
            trackingResult.textContent = error.message || "Could not connect to the Washex server. Make sure server.js is running.";
            trackingResult.classList.add("is-error");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}


// Show the signed-in user's name only when the server confirms a valid session.
const loggedInStatus = document.getElementById("loggedInStatus");
const loggedInName = document.getElementById("loggedInName");
if (loggedInStatus && loggedInName) {
    fetch("/session", { credentials: "same-origin" })
        .then(readApiResponse)
        .then(result => {
            if (result.authenticated && result.user && result.user.fullName) {
                loggedInName.textContent = `Logged in as ${result.user.fullName}`;
                loggedInStatus.hidden = false;
            } else {
                loggedInStatus.hidden = true;
            }
        })
        .catch(() => { loggedInStatus.hidden = true; });
}
