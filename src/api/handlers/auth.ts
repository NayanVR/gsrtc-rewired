import { implement } from "@orpc/server";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { appContract } from "#/api/contract";
import { auth } from "#/lib/auth";
import { addEventFields } from "#/lib/events";

const os = implement(appContract);

// The single server-side session check for all future gated handlers. The
// callback preserves each frozen oRPC procedure's typed UNAUTHORIZED error.
export async function requireSession(
	unauthorized: (options?: { data?: { reason?: "session_missing" } }) => Error
): Promise<NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>> {
	const currentSession = await auth.api.getSession({
		headers: getRequestHeaders(),
	});
	if (!currentSession) {
		addEventFields({ session_present: false });
		throw unauthorized({ data: { reason: "session_missing" } });
	}
	addEventFields({ session_present: true, user_id: currentSession.user.id });
	return currentSession;
}

function toContractUser(currentUser: {
	id: string;
	name: string;
	phoneNumber?: string | null;
}) {
	return {
		id: currentUser.id,
		mobile: currentUser.phoneNumber ?? undefined,
		name: currentUser.name,
	};
}

const session = os.auth.session.handler(async ({ errors }) => {
	const currentSession = await requireSession(errors.UNAUTHORIZED);
	return {
		user: toContractUser(currentSession.user),
	};
});

const logout = os.auth.logout.handler(async ({ errors }) => {
	await requireSession(errors.UNAUTHORIZED);
	await auth.api.signOut({ headers: getRequestHeaders() });
	return { ok: true };
});

export const authHandlers = { logout, session };
