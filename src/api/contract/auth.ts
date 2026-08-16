import * as v from "valibot";
import { base } from "#/api/contract/base";
import { Mobile, Session, User } from "#/api/schemas";

export const auth = {
	login: base
		.route({ method: "POST", path: "/auth/login", summary: "Password login" })
		.input(v.object({ mobile: Mobile, password: v.string() }))
		.output(Session),

	logout: base
		.route({ method: "POST", path: "/auth/logout", summary: "Log out" })
		.output(v.object({ ok: v.boolean() })),
	otpRequest: base
		.route({ method: "POST", path: "/auth/otp", summary: "Request OTP" })
		.input(v.object({ mobile: Mobile }))
		.output(v.object({ requestId: v.string() })),

	otpVerify: base
		.route({ method: "POST", path: "/auth/otp/verify", summary: "Verify OTP" })
		.input(
			v.object({
				otp: v.pipe(v.string(), v.regex(/^\d{4,6}$/)),
				requestId: v.string(),
			})
		)
		.output(Session),

	session: base
		.route({ method: "GET", path: "/auth/session", summary: "Current session" })
		.output(v.object({ user: User })),
};
