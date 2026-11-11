// Team leader — Laundry Status page

// Load the status page from the order ID in its URL; never assume a demo order.
const statusPage = document.querySelector(".tracking-page");
if (statusPage) {
    const params = new URLSearchParams(window.location.search);
    const orderId = (params.get("orderId") || "").trim().toUpperCase();
    const message = document.getElementById("status-page-message");
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value || "Not available";
    };
    const formatDateTime = value => {
        if (!value) return "Not available";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true
        }).format(date);
    };

    if (!/^WX-[0-9]{5}$/.test(orderId)) {
        if (message) message.textContent = "No laundry number was provided. Please return to Track Laundry and enter your order number.";
        setText("status-order-id", "No order selected");
    } else {
        fetch("/track-order", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: new URLSearchParams({ "laundry-number": orderId })
        }).then(async response => {
            const result = await readApiResponse(response);
            if (!response.ok) throw new Error(result.message || "Could not load this order.");
            const order = result.order;
            setText("status-order-id", order.orderId);
            setText("status-help-order-id", order.orderId);
            setText("status-customer-name", order.customerName);
            setText("status-service-type", order.serviceType);
            setText("status-date-submitted", order.dateSubmitted);
            setText("status-intake-desk", order.intakeDesk);
            setText("status-verified-weight", order.verifiedWeight);
            setText("status-collection-location", order.collectionLocation);
            setText("status-current-status", order.currentStatus);
            setText("status-estimated-completion", formatDateTime(order.estimatedCompletionAt || order.estimatedCompletion));
            setText("status-last-updated", `Last updated: ${formatDateTime(order.lastUpdatedAt)}`);
            const collection = new Date(order.expectedCollectionAt);
            if (!Number.isNaN(collection.getTime())) {
                setText("status-collection-date", new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(collection));
                setText("status-collection-time", new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(collection));
            } else {
                setText("status-collection-date", order.expectedCollection);
                setText("status-collection-time", order.expectedCollection);
            }
            document.querySelectorAll("[data-order-date]").forEach(element => {
                const value = order[element.dataset.orderDate];
                if (value) element.textContent = formatDateTime(value);
            });
            if (message) message.textContent = `Showing live details for laundry order ${order.orderId}.`;
        }).catch(error => {
            if (message) message.textContent = error.message || "Could not load this order. Please check the number and try again.";
            setText("status-order-id", orderId);
        });
    }
}


function printReceipt() {
    window.print();
}
