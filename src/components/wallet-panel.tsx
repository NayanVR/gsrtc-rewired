import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
	getPaymentProvider,
	getWalletAccount,
	getWalletPassbook,
	startWalletTopUp,
	topUpWallet,
} from "#/api/fns";
import type { Transaction, WalletAccount } from "#/api/schemas";
import { ErrorPanel } from "#/components/error-panel";
import { Alert } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Select } from "#/components/ui/select";
import { type AppError, toAppError } from "#/lib/error-copy";

const PASSBOOK_PAGE_SIZE = 10;
const MONEY_FORMATTER = new Intl.NumberFormat("en-IN", {
	currency: "INR",
	minimumFractionDigits: 2,
	style: "currency",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
	day: "2-digit",
	month: "short",
	year: "numeric",
});

type PaymentMethod = "upi" | "card" | "netbanking";

function money(amount: number): string {
	return MONEY_FORMATTER.format(amount);
}

function WalletBalance({ account }: { account: WalletAccount }) {
	return (
		<div className="mesh-hero relative overflow-hidden rounded-3xl p-6 text-white shadow-pop sm:p-7">
			<p className="text-sm text-white/70">Available balance</p>
			<p className="mt-1 font-bold font-display text-4xl tracking-tight">
				{money(account.balance)}
			</p>
			<p className="mt-4 text-sm text-white/70">
				{account.linkedMobile
					? `Linked mobile · ${account.linkedMobile}`
					: "No phone number linked yet"}
			</p>
		</div>
	);
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
	const credit = transaction.amount >= 0;
	return (
		<div className="flex items-center justify-between border-ink-100 border-b px-4 py-3 last:border-b-0">
			<div>
				<p className="font-medium text-ink-800 text-sm">
					{transaction.description}
				</p>
				<p className="text-ink-400 text-xs">
					{DATE_FORMATTER.format(new Date(transaction.date))}
				</p>
			</div>
			<span
				className={`font-semibold text-sm ${
					credit ? "text-brand-600" : "text-ink-700"
				}`}
			>
				{credit ? "+" : "−"}
				{money(Math.abs(transaction.amount))}
			</span>
		</div>
	);
}

// Wallet identity is always derived from the Better Auth session. No wallet
// action accepts a mobile number or user id from the browser.
export function WalletPanel({ variant }: { variant: "account" | "passbook" }) {
	const [account, setAccount] = useState<WalletAccount | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<AppError | null>(null);
	const [notice, setNotice] = useState("");
	const [amountError, setAmountError] = useState<string | null>(null);
	const [amount, setAmount] = useState("500");
	const [method, setMethod] = useState<PaymentMethod>("upi");
	const [paymentProvider, setPaymentProvider] = useState<"dodo" | "mock">(
		"mock"
	);

	useEffect(() => {
		getPaymentProvider()
			.then(setPaymentProvider)
			.catch(() => undefined);
	}, []);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const currentAccount = await getWalletAccount();
			setAccount(currentAccount);
			if (variant === "passbook") {
				const passbook = await getWalletPassbook({
					data: { page, pageSize: PASSBOOK_PAGE_SIZE },
				});
				setTransactions(passbook.transactions);
			}
		} catch (cause) {
			setError(toAppError(cause));
		} finally {
			setLoading(false);
		}
	}, [page, variant]);

	useEffect(() => {
		load();
	}, [load]);

	const submitTopUp = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const topUpAmount = Number(amount);
		if (!(Number.isFinite(topUpAmount) && topUpAmount >= 10)) {
			setAmountError("Enter an amount of at least ₹10.");
			return;
		}
		setSubmitting(true);
		setError(null);
		setNotice("");
		setAmountError(null);
		try {
			if (paymentProvider === "dodo") {
				const payment = await startWalletTopUp({
					data: { amount: topUpAmount },
				});
				window.location.assign(payment.checkoutUrl);
				return;
			}
			const result = await topUpWallet({
				data: { amount: topUpAmount, method },
			});
			setAccount((current) =>
				current ? { ...current, balance: result.balance } : current
			);
			setNotice(`Added ${money(topUpAmount)} to your wallet.`);
		} catch (cause) {
			setError(toAppError(cause));
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return <p className="text-ink-600">Loading your wallet…</p>;
	}

	if (!account) {
		return (
			<div className="max-w-2xl">
				{error ? (
					<ErrorPanel error={error} />
				) : (
					<Alert role="alert" tone="destructive">
						Your wallet is unavailable right now.
					</Alert>
				)}
			</div>
		);
	}

	return (
		<div className="max-w-2xl space-y-6">
			<WalletBalance account={account} />

			{variant === "account" ? (
				<form
					className="space-y-4 rounded-2xl border border-ink-100 bg-surface p-5 shadow-card"
					onSubmit={submitTopUp}
				>
					<div>
						<h2 className="font-bold font-display text-ink-900 text-xl">
							Add money
						</h2>
						<p className="mt-1 text-ink-500 text-sm">
							{paymentProvider === "dodo"
								? "Test mode. No real payment is taken."
								: "Payments are securely simulated in this concept build."}
						</p>
					</div>
					<Field error={amountError ?? undefined} label="Amount" required>
						{(props) => (
							<Input
								{...props}
								min={10}
								name="amount"
								onChange={(event) => {
									setAmount(event.target.value);
									setAmountError(null);
								}}
								required
								step="0.01"
								type="number"
								value={amount}
							/>
						)}
					</Field>
					{paymentProvider === "mock" ? (
						<Field label="Payment method" required>
							{(props) => (
								<Select
									{...props}
									name="method"
									onChange={(event) =>
										setMethod(event.target.value as PaymentMethod)
									}
									value={method}
								>
									<option value="upi">UPI</option>
									<option value="card">Card</option>
									<option value="netbanking">Netbanking</option>
								</Select>
							)}
						</Field>
					) : null}
					<Button
						className="w-full"
						disabled={submitting}
						loading={submitting}
						size="lg"
						type="submit"
					>
						Add money
					</Button>
				</form>
			) : (
				<div className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card">
					{transactions.length ? (
						transactions.map((transaction) => (
							<TransactionRow key={transaction.id} transaction={transaction} />
						))
					) : (
						<p className="px-4 py-8 text-center text-ink-500 text-sm">
							No wallet transactions yet.
						</p>
					)}
				</div>
			)}

			{variant === "passbook" ? (
				<div className="flex justify-between gap-3">
					<Button
						disabled={page === 1}
						onClick={() => setPage((current) => current - 1)}
						variant="secondary"
					>
						Previous
					</Button>
					<Button
						disabled={transactions.length < PASSBOOK_PAGE_SIZE}
						onClick={() => setPage((current) => current + 1)}
						variant="secondary"
					>
						Next
					</Button>
				</div>
			) : null}

			{error ? <ErrorPanel error={error} /> : null}
			{notice ? (
				<Alert aria-live="polite" tone="success">
					{notice}
				</Alert>
			) : null}
		</div>
	);
}
