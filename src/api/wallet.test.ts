import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/api/handlers/auth", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#/api/handlers/auth")>();
	return { ...actual, requireSession: vi.fn() };
});

import { requireSession } from "#/api/handlers/auth";
import { api } from "#/api/server";
import { getDb } from "#/db/client";
import { user, walletAccounts, walletTransactions } from "#/db/schema";
import * as payment from "#/lib/mock-payment";

const TEST_EMAIL = "wallet-task-08@example.test";
const TEST_USER_ID = "wallet-task-08-user";
const TEST_SESSION = {
	user: { id: TEST_USER_ID, phoneNumber: "9988776655" },
};
const mockedRequireSession = vi.mocked(requireSession);

async function clearTestWallet(): Promise<void> {
	const db = getDb();
	await db
		.delete(walletTransactions)
		.where(eq(walletTransactions.userId, TEST_USER_ID));
	await db
		.delete(walletAccounts)
		.where(eq(walletAccounts.userId, TEST_USER_ID));
	await db.delete(user).where(eq(user.id, TEST_USER_ID));
}

describe("wallet", () => {
	beforeEach(async () => {
		vi.restoreAllMocks();
		mockedRequireSession.mockReset();
		mockedRequireSession.mockResolvedValue(TEST_SESSION as never);
		await clearTestWallet();
		await getDb().insert(user).values({
			email: TEST_EMAIL,
			id: TEST_USER_ID,
			name: "Wallet Test User",
		});
	});

	afterEach(clearTestWallet);

	it("creates an account for the signed-in user and uses their phone only", async () => {
		const account = await api.wallet.account();

		expect(account).toEqual({
			balance: 0,
			kycStatus: "none",
			linkedMobile: "9988776655",
		});
	});

	it("credits a successful top-up and records it in the passbook", async () => {
		const topUp = await api.wallet.topUp({ amount: 250, method: "upi" });
		const passbook = await api.wallet.passbook({ page: 1, pageSize: 20 });

		expect(topUp.balance).toBe(250);
		expect(passbook.balance).toBe(250);
		expect(passbook.transactions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					amount: 250,
					id: topUp.transactionId,
					type: "credit",
				}),
			])
		);
	});

	it("renders stored debits as negative passbook amounts", async () => {
		await api.wallet.account();
		await getDb().insert(walletTransactions).values({
			amount: "120.00",
			description: "Ticket booking",
			id: "wallet-task-08-debit",
			type: "debit",
			userId: TEST_USER_ID,
		});

		const passbook = await api.wallet.passbook({ page: 1, pageSize: 20 });

		expect(passbook.transactions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ amount: -120, type: "debit" }),
			])
		);
	});

	it("rolls back a failed charge without recording a transaction", async () => {
		vi.spyOn(payment, "mockCharge").mockReturnValue({
			amount: 500,
			method: "upi",
			status: "failed",
		});

		await expect(
			api.wallet.topUp({ amount: 500, method: "upi" })
		).rejects.toMatchObject({ code: "PAYMENT_FAILED" });

		const passbook = await api.wallet.passbook({ page: 1, pageSize: 20 });
		expect(passbook).toEqual({ balance: 0, transactions: [] });
	});

	it("rejects amounts below the contract minimum before charging", async () => {
		const charge = vi.spyOn(payment, "mockCharge");
		await expect(
			api.wallet.topUp({ amount: 9, method: "card" })
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(charge).not.toHaveBeenCalled();
	});

	it("returns disjoint passbook pages", async () => {
		await api.wallet.account();
		await getDb()
			.insert(walletTransactions)
			.values([
				{
					amount: "100.00",
					createdAt: new Date("2026-08-01T10:00:00.000Z"),
					description: "First",
					id: "wallet-task-08-page-1",
					type: "credit",
					userId: TEST_USER_ID,
				},
				{
					amount: "200.00",
					createdAt: new Date("2026-08-02T10:00:00.000Z"),
					description: "Second",
					id: "wallet-task-08-page-2",
					type: "credit",
					userId: TEST_USER_ID,
				},
			]);

		const firstPage = await api.wallet.passbook({ page: 1, pageSize: 1 });
		const secondPage = await api.wallet.passbook({ page: 2, pageSize: 1 });

		expect(firstPage.transactions).toHaveLength(1);
		expect(secondPage.transactions).toHaveLength(1);
		expect(firstPage.transactions[0]?.id).not.toBe(
			secondPage.transactions[0]?.id
		);
	});

	it("rejects every wallet operation without a session", async () => {
		mockedRequireSession.mockImplementation((unauthorized) => {
			throw unauthorized();
		});

		await expect(api.wallet.account()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(
			api.wallet.passbook({ page: 1, pageSize: 20 })
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			api.wallet.topUp({ amount: 10, method: "netbanking" })
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});
});
