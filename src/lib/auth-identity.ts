const MOBILE_NUMBER = /^\d{10}$/;
const SYNTHETIC_PHONE_EMAIL_DOMAIN = "phone-login.invalid";

export function isValidMobileNumber(value: string): boolean {
	return MOBILE_NUMBER.test(value);
}

export function createSyntheticPhoneEmail(phoneNumber: string): string {
	return `phone-${phoneNumber}@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`;
}

export function isSyntheticPhoneEmail(email: string): boolean {
	return email.endsWith(`@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`);
}
