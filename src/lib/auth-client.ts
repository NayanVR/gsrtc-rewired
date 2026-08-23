import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser-safe counterpart to src/lib/auth.ts. Keep server auth and its
// database dependency out of client components.
export const authClient = createAuthClient({
	plugins: [phoneNumberClient()],
});
