import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getDb } from "#/db/client";
import {
	createSyntheticPhoneEmail,
	isValidMobileNumber,
} from "#/lib/auth-identity";
import { sendMockOtp } from "#/lib/mock-otp-delivery";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	database: drizzleAdapter(getDb(), { provider: "pg" }),
	emailAndPassword: { enabled: true },
	plugins: [
		phoneNumber({
			allowedAttempts: 3,
			expiresIn: 300,
			phoneNumberValidator: isValidMobileNumber,
			requireVerification: true,
			sendOTP: sendMockOtp,
			signUpOnVerification: {
				getTempEmail: createSyntheticPhoneEmail,
				getTempName: () => "Mobile passenger",
			},
		}),
		// Must remain last: this bridges Better Auth's Set-Cookie headers to
		// TanStack Start's server-function response handling.
		tanstackStartCookies(),
	],
});
