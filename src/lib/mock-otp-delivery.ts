// Real SMS delivery is intentionally out of scope for this concept build. In
// development, retain the latest code briefly so the login screen can show it
// as a toast. The code never reaches a production response or application log.
const DEVELOPMENT_OTP_TTL_MS = 5 * 60_000;

interface DevelopmentOtp {
	code: string;
	expiresAt: number;
}

const developmentOtps = new Map<string, DevelopmentOtp>();

function canExposeDevelopmentOtp(): boolean {
	return (
		process.env.NODE_ENV !== "production" ||
		process.env.OTP_DELIVERY_MODE === "mock"
	);
}

export function sendMockOtp(input: {
	code: string;
	phoneNumber: string;
}): void {
	if (!canExposeDevelopmentOtp()) {
		return;
	}

	developmentOtps.set(input.phoneNumber, {
		code: input.code,
		expiresAt: Date.now() + DEVELOPMENT_OTP_TTL_MS,
	});
}

export function getDevelopmentOtp(phoneNumber: string): string | null {
	if (!canExposeDevelopmentOtp()) {
		return null;
	}

	const otp = developmentOtps.get(phoneNumber);
	if (!otp) {
		return null;
	}
	if (otp.expiresAt <= Date.now()) {
		developmentOtps.delete(phoneNumber);
		return null;
	}
	return otp.code;
}

export function clearDevelopmentOtp(phoneNumber: string): void {
	developmentOtps.delete(phoneNumber);
}
