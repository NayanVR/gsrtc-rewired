import { eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/api/handlers/auth", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#/api/handlers/auth")>();
	return { ...actual, requireSession: vi.fn() };
});

import { requireSession } from "#/api/handlers/auth";
import { api } from "#/api/server";
import { getDb } from "#/db/client";
import { agentETopTransactions, agents } from "#/db/schema";

const TEST_MOBILE = "6000000010";
const mockedRequireSession = vi.mocked(requireSession);

async function clearTestAgents(): Promise<void> {
	const db = getDb();
	const testAgents = await db
		.select({ agentCode: agents.agentCode })
		.from(agents)
		.where(eq(agents.mobile, TEST_MOBILE));
	const agentCodes = testAgents.map((agent) => agent.agentCode);
	if (agentCodes.length > 0) {
		await db
			.delete(agentETopTransactions)
			.where(inArray(agentETopTransactions.agentCode, agentCodes));
	}
	await db.delete(agents).where(eq(agents.mobile, TEST_MOBILE));
}

async function registerTestAgent() {
	const registration = await api.agents.register({
		division: "Ahmedabad",
		email: "agent-task-10@example.test",
		mobile: TEST_MOBILE,
		name: "Agent Test User",
		pan: "ABCDE1234F",
	});
	const [agent] = await getDb()
		.select({
			agentCode: agents.agentCode,
			applicationNo: agents.applicationNo,
			status: agents.status,
		})
		.from(agents)
		.where(eq(agents.applicationNo, registration.applicationNo));
	if (!agent) {
		throw new Error("Registered agent was not persisted.");
	}
	return agent;
}

describe("agents", () => {
	beforeEach(async () => {
		vi.restoreAllMocks();
		mockedRequireSession.mockReset();
		mockedRequireSession.mockResolvedValue({
			user: { id: "agent-task-10-user", phoneNumber: TEST_MOBILE },
		} as never);
		await clearTestAgents();
	});

	afterEach(clearTestAgents);

	it("registers an applied agent without exposing their PAN", async () => {
		const registration = await api.agents.register({
			division: "Ahmedabad",
			email: "agent-task-10@example.test",
			mobile: TEST_MOBILE,
			name: "Agent Test User",
			pan: "ABCDE1234F",
		});
		const [storedAgent] = await getDb()
			.select({ status: agents.status })
			.from(agents)
			.where(eq(agents.applicationNo, registration.applicationNo));

		expect(registration).toEqual({ applicationNo: registration.applicationNo });
		expect(storedAgent).toEqual({ status: "applied" });
		expect(JSON.stringify(registration)).not.toContain("ABCDE1234F");
	});

	it("rejects invalid PANs without including their value in the error", async () => {
		const invalidPan = "not-a-pan";

		try {
			await api.agents.register({
				division: "Ahmedabad",
				email: "agent-task-10@example.test",
				mobile: TEST_MOBILE,
				name: "Agent Test User",
				pan: invalidPan,
			});
			expect.unreachable("Expected contract validation to reject the PAN.");
		} catch (error) {
			expect(error).toMatchObject({ code: "BAD_REQUEST" });
			expect(JSON.stringify(error)).not.toContain(invalidPan);
		}
	});

	it("returns persisted allotment and E-Top status to a signed-in user", async () => {
		const agent = await registerTestAgent();
		await getDb()
			.update(agents)
			.set({
				allottedRoutes: ["Ahmedabad → Vadodara", "Ahmedabad → Surat"],
				allottedSeats: 24,
			})
			.where(eq(agents.agentCode, agent.agentCode));
		await getDb().insert(agentETopTransactions).values({
			agentCode: agent.agentCode,
			amount: "750.00",
			status: "success",
			transactionId: "agent-task-10-etop",
		});

		await expect(
			api.agents.allotment({ agentCode: agent.agentCode })
		).resolves.toEqual({
			routes: ["Ahmedabad → Vadodara", "Ahmedabad → Surat"],
			seats: 24,
		});
		await expect(
			api.agents.eTopStatus({ transactionId: "agent-task-10-etop" })
		).resolves.toEqual({ amount: 750, status: "success" });
	});

	it("returns NOT_FOUND for unknown agent codes and E-Top transactions", async () => {
		await expect(
			api.agents.allotment({ agentCode: "AGTUNKNOWN" })
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			api.agents.eTopStatus({ transactionId: "UNKNOWN" })
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("uses the existing session helper for protected agent operations", async () => {
		mockedRequireSession.mockImplementation((unauthorized) => {
			throw unauthorized();
		});

		await expect(
			api.agents.allotment({ agentCode: "AGTUNKNOWN" })
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			api.agents.eTopStatus({ transactionId: "UNKNOWN" })
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("does not create a second agent password session", async () => {
		await expect(
			api.agents.login({ agentId: "agent-1", password: "password" })
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});
});
