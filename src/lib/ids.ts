// Human-facing identifiers, styled after GSRTC's existing formats (PNR,
// application numbers, refund references). Internal row ids just use
// crypto.randomUUID() directly at the call site.
const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

function randomCode(length: number): string {
	let out = "";
	for (let i = 0; i < length; i += 1) {
		out += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
	}
	return out;
}

export function generatePnr(): string {
	return `GJ${randomCode(8)}`;
}

export function generateApplicationNo(): string {
	return `PASS${randomCode(7)}`;
}

export function generateRefundRef(): string {
	return `RF${randomCode(8)}`;
}

export function generateComplaintId(): string {
	return `CMP${randomCode(7)}`;
}

export function generateOtp(): string {
	return String(Math.floor(100_000 + Math.random() * 900_000));
}
