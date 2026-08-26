import { implement } from "@orpc/server";
import { eq } from "drizzle-orm";
import { appContract } from "#/api/contract";
import { requireSession } from "#/api/handlers/auth";
import { getDb } from "#/db/client";
import { agentETopTransactions, agents } from "#/db/schema";
import { generateAgentApplicationNo, generateAgentCode } from "#/lib/ids";

const os = implement(appContract);

const register = os.agents.register.handler(async ({ input }) => {
	const applicationNo = generateAgentApplicationNo();

	await getDb().insert(agents).values({
		agentCode: generateAgentCode(),
		allottedRoutes: [],
		applicationNo,
		division: input.division,
		email: input.email,
		mobile: input.mobile,
		name: input.name,
		pan: input.pan,
	});

	return { applicationNo };
});

const login = os.agents.login.handler(({ errors }) => {
	// Agent credentials have not been linked to Better Auth. Creating a second
	// password verifier or cookie here would violate task 07's single-session rule.
	throw errors.UNAUTHORIZED({ data: { reason: "session_missing" } });
});

const allotment = os.agents.allotment.handler(async ({ input, errors }) => {
	await requireSession(errors.UNAUTHORIZED);
	const [agent] = await getDb()
		.select({
			allottedRoutes: agents.allottedRoutes,
			allottedSeats: agents.allottedSeats,
		})
		.from(agents)
		.where(eq(agents.agentCode, input.agentCode))
		.limit(1);
	if (!agent) {
		throw errors.NOT_FOUND({ data: { reason: "agent_unknown" } });
	}
	return { routes: agent.allottedRoutes, seats: agent.allottedSeats };
});

const eTopStatus = os.agents.eTopStatus.handler(async ({ input, errors }) => {
	await requireSession(errors.UNAUTHORIZED);
	const [transaction] = await getDb()
		.select()
		.from(agentETopTransactions)
		.where(eq(agentETopTransactions.transactionId, input.transactionId))
		.limit(1);
	if (!transaction) {
		throw errors.NOT_FOUND({ data: { reason: "agent_unknown" } });
	}
	return { amount: Number(transaction.amount), status: transaction.status };
});

export const agentHandlers = { allotment, eTopStatus, login, register };
