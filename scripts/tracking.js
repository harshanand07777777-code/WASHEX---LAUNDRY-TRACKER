// Track existing orders and create new orders using the signed-in account.
const trackingForm = document.getElementById("trackingForm");
const trackingResult = document.getElementById("trackingResult");
const placeOrderSection = document.getElementById("placeOrderSection");
const placeOrderForm = document.getElementById("placeOrderForm");
const orderCreateResult = document.getElementById("orderCreateResult");
const loggedInStatus = document.getElementById("loggedInStatus");
const loggedInName = document.getElementById("loggedInName");

function showOrderDetails(order) {
    trackingResult.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = `Order ${order.orderId}`;
    const status = document.createElement("p");
    status.className = "tracking-result-status";
    status.textContent = `Current status: ${order.currentStatus}`;
    const details = document.createElement("dl");
    [
        ["Customer", order.customerName], ["Service", order.serviceType],
        ["Date submitted", order.dateSubmitted], ["Intake desk", order.intakeDesk],
        ["Verified weight", order.verifiedWeight], ["Expected collection", order.expectedCollection],
        ["Collection location", order.collectionLocation], ["Estimated completion", order.estimatedCompletion]
    ].forEach(([label, value]) => {
        const term = document.createElement("dt"); term.textContent = label;
        const description = document.createElement("dd"); description.textContent = value || "Not available";
        details.append(term, description);
    });
    const link = document.createElement("a");
    link.href = `LaundryStatus.html?orderId=${encodeURIComponent(order.orderId)}`;
    link.textContent = "View full order status";
    link.className = "tracking-status-link";
    trackingResult.append(heading, status, details, link);
    trackingResult.className = "tracking-result is-success";
    trackingResult.hidden = false;
}

async function postForm(url, form) {
    const response = await fetch(url, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams(new FormData(form))
    });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.message || "Request failed.");
    return result;
}

if (trackingForm && trackingResult) {
    const input = trackingForm.querySelector('[name="laundry-number"]');
    input?.addEventListener("input", function () { this.value = this.value.toUpperCase().replace(/\s+/g, ""); });
    trackingForm.addEventListener("submit", async event => {
        event.preventDefault();
        const button = trackingForm.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        trackingResult.hidden = false;
        trackingResult.className = "tracking-result";
        trackingResult.textContent = "Looking up your laundry order…";
        try {
            const result = await postForm("/track-order", trackingForm);
            showOrderDetails(result.order);
        } catch (error) {
            trackingResult.textContent = error.message || "Could not connect to the WASHEX server.";
            trackingResult.className = "tracking-result is-error";
        } finally { if (button) button.disabled = false; }
    });
}

if (placeOrderForm) {
    placeOrderForm.addEventListener("submit", async event => {
        event.preventDefault();
        const button = placeOrderForm.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        orderCreateResult.hidden = false;
        orderCreateResult.className = "tracking-result";
        orderCreateResult.textContent = "Submitting your laundry order…";
        try {
            const result = await postForm("/orders", placeOrderForm);
            orderCreateResult.replaceChildren();
            const message = document.createElement("p");
            message.textContent = result.message;
            const number = document.createElement("h2");
            number.textContent = `Your laundry number: ${result.orderId}`;
            const hint = document.createElement("p");
            hint.textContent = "Keep this number safe. Enter it in the tracking form below to check your order.";
            orderCreateResult.append(message, number, hint);
            orderCreateResult.className = "tracking-result is-success";
            placeOrderForm.reset();
            const trackInput = trackingForm?.querySelector('[name="laundry-number"]');
            if (trackInput) trackInput.value = result.orderId;
        } catch (error) {
            orderCreateResult.textContent = error.message || "Could not create your order.";
            orderCreateResult.className = "tracking-result is-error";
        } finally { if (button) button.disabled = false; }
    });
}

fetch("/session", { credentials: "include" })
    .then(readApiResponse)
    .then(result => {
        if (result.authenticated && result.user) {
            if (loggedInName) loggedInName.textContent = `Logged in as ${result.user.fullName}`;
            if (loggedInStatus) loggedInStatus.hidden = false;
            if (placeOrderSection) placeOrderSection.hidden = false;
        } else {
            if (loggedInStatus) loggedInStatus.hidden = true;
            if (placeOrderSection) placeOrderSection.hidden = true;
        }
    })
    .catch(() => { if (placeOrderSection) placeOrderSection.hidden = true; });
