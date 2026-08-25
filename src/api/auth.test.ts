import { eq, inArray } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { safeParse } from "valibot";
import { afterEach, describe, expect, it } from "vitest";
import { Mobile, User } from "#/api/schemas";
import { getDb } from "#/db/client";
import {
	account,
	session,
	user,
	verification,
	walletAccounts,
	walletTransactions,
} from "#/db/schema";
import { auth } from "#/lib/auth";
import {
	createSyntheticPhoneEmail,
	isSyntheticPhoneEmail,
	isValidMobileNumber,
} from "#/lib/auth-identity";
import {
	clearDevelopmentOtp,
	getDevelopmentOtp,
	sendMockOtp,
} from "#/lib/mock-otp-delivery";

const TEST_MOBILES = ["9012345678", "9012345679", "9012345680"];
const [OTP_TEST_MOBILE, LINKED_TEST_MOBILE, PRODUCTION_TEST_MOBILE] =
	TEST_MOBILES;

function referencesAuthUser(
	table: typeof walletAccounts | typeof walletTransactions
) {
	return getTableConfig(table).foreignKeys.some(
		(foreignKey) => foreignKey.reference().foreignTable === user
	);
}

async function removeOtpTestData(): Promise<void> {
	const db = getDb();
	const otpUsers = await db
		.select({ id: user.id })
		.from(user)
		.where(inArray(user.phoneNumber, TEST_MOBILES));
	const userIds = otpUsers.map((otpUser) => otpUser.id);

	if (userIds.length > 0) {
		await db.delete(session).where(inArray(session.userId, userIds));
		await db.delete(account).where(inArray(account.userId, userIds));
		await db.delete(user).where(inArray(user.id, userIds));
	}
	await db
		.delete(verification)
		.where(inArray(verification.identifier, TEST_MOBILES));
	for (const mobile of TEST_MOBILES) {
		clearDevelopmentOtp(mobile);
	}
}

async function requestOtp(phoneNumber: string): Promise<string> {
	await auth.api.sendPhoneNumberOTP({ body: { phoneNumber } });
	const otp = getDevelopmentOtp(phoneNumber);
	if (!otp) {
		throw new Error("Expected development OTP delivery.");
	}
	return otp;
}

function toSessionHeaders(headers: Headers): Headers {
	const setCookie = headers.get("set-cookie");
	const sessionCookie = setCookie?.split(";")[0];
	if (!sessionCookie) {
		throw new Error("Expected Better Auth to set a session cookie.");
	}
	return new Headers({ cookie: sessionCookie });
}

describe("Better Auth identity contract", () => {
	afterEach(removeOtpTestData);

	it("allows an email-only session user and points wallets to Better Auth", () => {
		expect(safeParse(User, { id: "user-1", name: "Asha Patel" }).success).toBe(
			true
		);
		expect(referencesAuthUser(walletAccounts)).toBe(true);
		expect(referencesAuthUser(walletTransactions)).toBe(true);
	});

	it("keeps the plugin mobile validator aligned with the public Mobile schema", () => {
		for (const mobile of [
			"9876543210",
			"987654321",
			"+919876543210",
			"987654321a",
		]) {
			expect(isValidMobileNumber(mobile)).toBe(
				safeParse(Mobile, mobile).success
			);
		}
	});

	it("creates a Better Auth session from a verified mobile OTP", async () => {
		const phoneNumber = OTP_TEST_MOBILE;
		const code = await requestOtp(phoneNumber);
		const verified = await auth.api.verifyPhoneNumber({
			body: { code, phoneNumber },
			returnHeaders: true,
		});

		expect(verified.response.user?.phoneNumber).toBe(phoneNumber);
		expect(verified.response.user?.phoneNumberVerified).toBe(true);
		expect(verified.response.token).toEqual(expect.any(String));
		const currentSession = await auth.api.getSession({
			headers: toSessionHeaders(verified.headers),
		});
		expect(currentSession?.user.id).toBe(verified.response.user?.id);
		expect(isSyntheticPhoneEmail(verified.response.user?.email ?? "")).toBe(
			true
		);
	}, 30_000);

	it("rejects an expired mobile OTP", async () => {
		const phoneNumber = OTP_TEST_MOBILE;
		const code = await requestOtp(phoneNumber);
		await getDb()
			.update(verification)
			.set({ expiresAt: new Date(Date.now() - 1) })
			.where(eq(verification.identifier, phoneNumber));

		await expect(
			auth.api.verifyPhoneNumber({ body: { code, phoneNumber } })
		).rejects.toMatchObject({ body: { code: "OTP_EXPIRED" } });
	});

	it("stops accepting a code after the allowed number of failed attempts", async () => {
		const phoneNumber = OTP_TEST_MOBILE;
		const code = await requestOtp(phoneNumber);

		await expect(
			auth.api.verifyPhoneNumber({ body: { code: "000000", phoneNumber } })
		).rejects.toMatchObject({ body: { code: "INVALID_OTP" } });
		await expect(
			auth.api.verifyPhoneNumber({ body: { code: "000000", phoneNumber } })
		).rejects.toMatchObject({ body: { code: "INVALID_OTP" } });
		await expect(
			auth.api.verifyPhoneNumber({ body: { code: "000000", phoneNumber } })
		).rejects.toMatchObject({ body: { code: "INVALID_OTP" } });
		await expect(
			auth.api.verifyPhoneNumber({ body: { code, phoneNumber } })
		).rejects.toMatchObject({ body: { code: "TOO_MANY_ATTEMPTS" } });
	}, 15_000);

	it("rejects linking a mobile number that belongs to another account", async () => {
		const existingPhone = OTP_TEST_MOBILE;
		const existingCode = await requestOtp(existingPhone);
		await expect(
			auth.api.verifyPhoneNumber({
				body: { code: existingCode, phoneNumber: existingPhone },
			})
		).resolves.toMatchObject({ status: true });

		const secondUserPhone = LINKED_TEST_MOBILE;
		const secondUserCode = await requestOtp(secondUserPhone);
		const secondUser = await auth.api.verifyPhoneNumber({
			body: { code: secondUserCode, phoneNumber: secondUserPhone },
			returnHeaders: true,
		});
		expect(secondUser.response.status).toBe(true);
		const phoneToLink = PRODUCTION_TEST_MOBILE;
		const code = await requestOtp(phoneToLink);

		await expect(
			auth.api.verifyPhoneNumber({
				body: {
					code,
					phoneNumber: phoneToLink,
					updatePhoneNumber: true,
				},
				headers: toSessionHeaders(secondUser.headers),
			})
		).resolves.toMatchObject({ status: true });

		const codeForExistingPhone = await requestOtp(existingPhone);
		await expect(
			auth.api.verifyPhoneNumber({
				body: {
					code: codeForExistingPhone,
					phoneNumber: existingPhone,
					updatePhoneNumber: true,
				},
				headers: toSessionHeaders(secondUser.headers),
			})
		).rejects.toMatchObject({ body: { code: "PHONE_NUMBER_EXIST" } });

		const linkedUser = await getDb()
			.select({ phoneNumber: user.phoneNumber })
			.from(user)
			.where(eq(user.id, secondUser.response.user.id));
		expect(linkedUser[0]?.phoneNumber).toBe(phoneToLink);
	}, 30_000);

	it("does not retain or expose a mock OTP in production", () => {
		const phoneNumber = PRODUCTION_TEST_MOBILE;
		const previousNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			sendMockOtp({ code: "123456", phoneNumber });
			expect(getDevelopmentOtp(phoneNumber)).toBeNull();
		} finally {
			process.env.NODE_ENV = previousNodeEnv;
		}
	});

	it("allows a mock OTP only when production mock mode is explicit", () => {
		const phoneNumber = PRODUCTION_TEST_MOBILE;
		const previousNodeEnv = process.env.NODE_ENV;
		const previousOtpDeliveryMode = process.env.OTP_DELIVERY_MODE;
		process.env.NODE_ENV = "production";
		process.env.OTP_DELIVERY_MODE = "mock";
		try {
			sendMockOtp({ code: "123456", phoneNumber });
			expect(getDevelopmentOtp(phoneNumber)).toBe("123456");
		} finally {
			process.env.NODE_ENV = previousNodeEnv;
			process.env.OTP_DELIVERY_MODE = previousOtpDeliveryMode;
		}
	});

	it("marks phone-only accounts with a synthetic email that the UI can hide", () => {
		const email = createSyntheticPhoneEmail(OTP_TEST_MOBILE);
		expect(isSyntheticPhoneEmail(email)).toBe(true);
		expect(isSyntheticPhoneEmail("passenger@example.com")).toBe(false);
	});
});
