import { implement } from "@orpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { appContract } from "#/api/contract";
import { requireSession } from "#/api/handlers/auth";
import { startWalletTopUp } from "#/api/services/payments";
import { getDb } from "#/db/client";
import { walletAccounts, walletTransactions } from "#/db/schema";
import { getPaymentsProvider } from "#/lib/dodo";
import { addEventFields } from "#/lib/events";
import { mockCharge } from "#/lib/mock-payment";

const os = implement(appContract);

function toAccount(
	walletAccount: typeof walletAccounts.$inferSelect,
	phoneNumber: string | null | undefined
) {
	return {
		balance: Number(walletAccount.balance),
		kycStatus: walletAccount.kycStatus,
		linkedMobile: phoneNumber ?? undefined,
	};
}

function toTransaction(transaction: typeof walletTransactions.$inferSelect) {
	const amount = Number(transaction.amount);
	return {
		amount: transaction.type === "credit" ? amount : -amount,
		date: transaction.createdAt.toISOString(),
		description: transaction.description,
		id: transaction.id,
		type: transaction.type,
	};
}

async function getOrCreateWalletAccount(userId: string, conflict: () => Error) {
	const db = getDb();
	await db
		.insert(walletAccounts)
		.values({ userId })
		.onConflictDoNothing({ target: walletAccounts.userId });
	const [account] = await db
		.select()
		.from(walletAccounts)
		.where(eq(walletAccounts.userId, userId))
		.limit(1);
	if (!account) {
		throw conflict();
	}
	return account;
}

const account = os.wallet.account.handler(async ({ errors }) => {
	const currentSession = await requireSession(errors.UNAUTHORIZED);
	addEventFields({ user_id: currentSession.user.id });
	const walletAccount = await getOrCreateWalletAccount(
		currentSession.user.id,
		errors.CONFLICT
	);
	return toAccount(walletAccount, currentSession.user.phoneNumber);
});

const passbook = os.wallet.passbook.handler(async ({ input, errors }) => {
	const currentSession = await requireSession(errors.UNAUTHORIZED);
	addEventFields({ user_id: currentSession.user.id });
	const walletAccount = await getOrCreateWalletAccount(
		currentSession.user.id,
		errors.CONFLICT
	);
	const page = input.page ?? 1;
	const pageSize = input.pageSize ?? 20;
	const transactions = await getDb()
		.select()
		.from(walletTransactions)
		.where(eq(walletTransactions.userId, currentSession.user.id))
		.orderBy(desc(walletTransactions.createdAt), desc(walletTransactions.id))
		.limit(pageSize)
		.offset((page - 1) * pageSize);
	return {
		balance: Number(walletAccount.balance),
		transactions: transactions.map(toTransaction),
	};
});

const topUp = os.wallet.topUp.handler(async ({ input, errors }) => {
	const currentSession = await requireSession(errors.UNAUTHORIZED);
	addEventFields({
		amount_paise: Math.round(input.amount * 100),
		payment_method: input.method,
		payment_purpose: "wallet_topup",
		user_id: currentSession.user.id,
	});
	if (getPaymentsProvider() === "dodo") {
		throw errors.PAYMENT_FAILED({ data: { reason: "mock_provider_disabled" } });
	}
	return getDb().transaction(async (tx) => {
		await tx
			.insert(walletAccounts)
			.values({ userId: currentSession.user.id })
			.onConflictDoNothing({ target: walletAccounts.userId });
		const [walletAccount] = await tx
			.select()
			.from(walletAccounts)
			.where(eq(walletAccounts.userId, currentSession.user.id))
			.for("update")
			.limit(1);
		if (!walletAccount) {
			throw errors.CONFLICT({ data: { reason: "wallet_account_missing" } });
		}

		const payment = mockCharge({
			amount: input.amount,
			idempotencyKey: crypto.randomUUID(),
			method: input.method,
		});
		if (payment.status === "failed") {
			throw errors.PAYMENT_FAILED({ data: { reason: "charge_declined" } });
		}

		await tx.insert(walletTransactions).values({
			amount: input.amount.toFixed(2),
			description: `Wallet top-up · ${input.method.toUpperCase()}`,
			id: payment.transactionId,
			type: "credit",
			userId: currentSession.user.id,
		});
		const [updatedAccount] = await tx
			.update(walletAccounts)
			.set({ balance: sql`${walletAccounts.balance} + ${input.amount}` })
			.where(eq(walletAccounts.userId, currentSession.user.id))
			.returning({ balance: walletAccounts.balance });
		if (!updatedAccount) {
			throw errors.CONFLICT({ data: { reason: "wallet_account_missing" } });
		}
		return {
			balance: Number(updatedAccount.balance),
			transactionId: payment.transactionId,
		};
	});
});

const startTopUp = os.wallet.startTopUp.handler(async ({ input, errors }) => {
	const currentSession = await requireSession(errors.UNAUTHORIZED);
	addEventFields({
		amount_paise: Math.round(input.amount * 100),
		payment_provider: "dodo",
		payment_purpose: "wallet_topup",
		user_id: currentSession.user.id,
	});
	if (getPaymentsProvider() !== "dodo") {
		throw errors.PAYMENT_FAILED({ data: { reason: "mock_provider_disabled" } });
	}
	return startWalletTopUp(input.amount, currentSession.user, errors);
});

export const walletHandlers = { account, passbook, startTopUp, topUp };
