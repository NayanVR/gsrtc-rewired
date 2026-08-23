export type TicketDeliveryChannel = "sms" | "email";

// Delivery is an explicit seam: production can replace this with an SMS or
// email provider without changing ticket lookup or authorization behavior.
export function sendTicket(input: {
	channel: TicketDeliveryChannel;
	mobile: string;
	ticketNo: string;
}): boolean {
	return input.channel === "sms" || input.channel === "email";
}
