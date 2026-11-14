// Laundry Status page: load the order named in ?orderId=WX-12345 from the server
// and fill in the page. All text is inserted with textContent (never innerHTML).

const STATUS_STEPS = [
    "Clothes Submitted",
    "Washing & Drying",
    "Ironing",
    "Ready for Collection",
    "Collected"
];

const STATUS_DESCRIPTIONS = [
    "Your laundry has been received and tagged at the intake desk. Washing will start shortly.",
    "Your clothes are being washed and tumble dried.",
    "Your clothes have passed the gentle wash & tumble dry cycle and are currently being steam pressed.",
    "Your laundry is pressed, bagged and waiting for you.",
    "Your laundry has been collected. Thank you for using Washex!"
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function printReceipt() {
    window.print();
}

function toDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
    return date.getDate() + " " + MONTHS[date.getMonth()];
}

function formatDateTime(value) {
    const date = toDate(value);
    if (!date) return "";
    const hours = date.getHours();
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return formatDate(date) + " " + date.getFullYear() + ", " +
        String(hour12).padStart(2, "0") + ":" + minutes + (hours < 12 ? " AM" : " PM");
}

function daySlot(date) {
    const hours = date.getHours();
    const slot = hours < 12 ? "Morning" : hours < 17 ? "Afternoon" : "Evening";
    return WEEKDAYS[date.getDay()] + " " + slot;
}

function setField(name, value, fallback) {
    document.querySelectorAll('[data-field="' + name + '"]').forEach(function (element) {
        element.textContent = value || fallback || "Not available";
    });
}

function showStatusMessage(text, isError) {
    const box = document.getElementById("statusMessage");
    const content = document.getElementById("statusContent");
    if (content) content.hidden = true;
    if (!box) return;
    box.hidden = false;
    box.className = "status-message" + (isError ? " is-error" : "");
    box.replaceChildren(document.createTextNode(text + " "));
    const link = document.createElement("a");
    link.href = "TrackPage.html";
    link.textContent = "Back to tracking";
    if (isError) box.appendChild(link);
}

function renderOrder(order) {
    const location = order.collectionLocation || "your locker";
    let current = STATUS_STEPS.findIndex(function (step) {
        return step.toLowerCase() === String(order.currentStatus || "").toLowerCase();
    });
    if (current === -1) current = 0;
    const lastStep = STATUS_STEPS.length - 1;
    const finished = current === lastStep;

    // Order information
    setField("orderId", order.orderId);
    setField("customerName", order.customerName);
    setField("serviceType", order.serviceType);
    setField("dateSubmitted", order.dateSubmitted || formatDateTime(order.dateSubmittedAt));
    setField("intakeDesk", order.intakeDesk);
    setField("verifiedWeight", order.verifiedWeight);
    setField("helpTitle", "Need assistance with order " + order.orderId + "?");

    const activeBadge = document.querySelector(".tr-active-badge");
    if (activeBadge) activeBadge.textContent = finished ? "Completed" : "Active Cycle";

    // Expected collection card
    const collectionAt = toDate(order.expectedCollectionAt);
    setField("collectionDay", collectionAt ? formatDate(collectionAt) : order.expectedCollection);
    setField("collectionSlot", collectionAt ? daySlot(collectionAt) : "");
    setField(
        "collectionNote",
        finished
            ? "Your laundry was collected from " + location + "."
            : "Your laundry is expected to be ready for collection at " + location + " on this date."
    );

    // Current status card
    setField("statusTitle", "Current Status: " + (STATUS_STEPS[current] || order.currentStatus));
    setField("stepBadge", "STEP " + (current + 1) + " OF " + STATUS_STEPS.length);
    setField(
        "statusDescription",
        current === 3
            ? "Your laundry is pressed, bagged and waiting in " + location + "."
            : STATUS_DESCRIPTIONS[current]
    );
    setField("estimatedCompletion", order.estimatedCompletion);
    const fill = document.querySelector(".tr-progress-fill");
    if (fill) fill.style.width = ((current + 1) / STATUS_STEPS.length) * 100 + "%";

    // Timeline
    setField("lastUpdated", "Last updated: " + (formatDateTime(order.lastUpdatedAt) || "Not available"));

    const times = [
        formatDateTime(order.dateSubmittedAt),
        formatDateTime(order.washingCompletedAt),
        order.ironingStartedAt
            ? (current === 2 ? "Active since " : "Started ") + formatDateTime(order.ironingStartedAt)
            : "",
        order.expectedCollectionAt
            ? (current >= 3 ? "Ready by " : "Est. ") + formatDateTime(order.expectedCollectionAt)
            : "",
        ""
    ];
    const descriptions = [
        "Intake verified & tagged at the student residential desk.",
        "Cleaned with hypoallergenic eco-safe detergent at 40°C.",
        current === 2
            ? "Currently being steam pressed and carefully hung."
            : "Steam pressed and carefully hung.",
        current >= 3
            ? "Pressed, bagged and placed in " + location + "."
            : "Moves to " + location + " once pressed and bagged.",
        finished
            ? "Order picked up by " + order.customerName + " and marked complete in the system."
            : "Will be marked complete once " + order.customerName + " collects the order."
    ];

    document.querySelectorAll(".tr-timeline-item").forEach(function (item, index) {
        // A finished order has no "in progress" step: everything is completed.
        const state = finished || index < current ? "completed" : index === current ? "in-progress" : "upcoming";
        item.classList.remove("completed", "in-progress", "upcoming");
        item.classList.add(state);

        const marker = item.querySelector(".tr-timeline-marker span");
        if (marker) marker.textContent = state === "completed" ? "✓" : "";

        const badge = item.querySelector(".tr-timeline-badge");
        if (badge) {
            badge.classList.remove("completed-badge", "progress-badge", "upcoming-badge");
            badge.classList.add(state === "completed" ? "completed-badge" : state === "in-progress" ? "progress-badge" : "upcoming-badge");
            badge.textContent = state === "completed" ? "COMPLETED" : state === "in-progress" ? "IN PROGRESS" : "UPCOMING";
        }

        const description = item.querySelector(".tr-timeline-body p");
        if (description) description.textContent = descriptions[index];

        const time = item.querySelector(".tr-timeline-body small");
        if (time) {
            time.textContent = times[index];
            time.hidden = !times[index];
        }
    });

    const message = document.getElementById("statusMessage");
    const content = document.getElementById("statusContent");
    if (message) message.hidden = true;
    if (content) content.hidden = false;
    document.title = "Order " + order.orderId + " | Washex";
}

document.addEventListener("DOMContentLoaded", async function () {
    Washex.markActiveNav();

    const printButton = document.getElementById("printReceiptBtn");
    if (printButton) printButton.addEventListener("click", printReceipt);

    if (!document.getElementById("statusContent")) return;

    const orderId = (new URLSearchParams(window.location.search).get("orderId") || "").trim().toUpperCase();
    if (!/^WX-[0-9]{5}$/.test(orderId)) {
        showStatusMessage("No valid laundry number was given. Enter your number (like WX-10025) on the tracking page.", true);
        return;
    }

    showStatusMessage("Loading your order…", false);
    try {
        const response = await fetch(Washex.apiUrl("/track-order"), {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: new URLSearchParams({ "laundry-number": orderId })
        });
        const result = await readApiResponse(response);
        if (!response.ok || !result.order) {
            showStatusMessage(result.message || "Could not load this order.", true);
            return;
        }
        renderOrder(result.order);
    } catch (error) {
        console.error(error);
        showStatusMessage(Washex.CONNECTION_ERROR, true);
    }
});
