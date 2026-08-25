import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageShell } from "#/components/page-shell";
import { ProfilePanel } from "#/components/profile-panel";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/profile")({
	beforeLoad: async () => {
		const result = await authClient.getSession();
		if (!result.data?.user) {
			throw redirect({ to: "/login" });
		}
		return { user: result.data.user };
	},
	component: ProfilePage,
});

function ProfilePage() {
	const { user } = Route.useRouteContext();

	return (
		<PageShell
			blurb="View your bookings, resend ticket details and manage eligible cancellations."
			title="My profile"
		>
			<ProfilePanel mobile={user.phoneNumber ?? undefined} name={user.name} />
		</PageShell>
	);
}
