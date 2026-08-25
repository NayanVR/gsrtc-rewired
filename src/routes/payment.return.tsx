import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPaymentStatus } from "#/api/fns";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";

type PaymentStatus = Awaited<ReturnType<typeof getPaymentStatus>>;

export const Route = createFileRoute("/payment/return")({
	validateSearch: (search: Record<string, unknown>) => ({
		intent: typeof search.intent === "string" ? search.intent : "",
	}),
	component: PaymentReturnPage,
});

function PaymentReturnPage() {
	const { intent } = Route.useSearch();
	const [payment, setPayment] = useState<PaymentStatus | null>(null);
	const [timedOut, setTimedOut] = useState(false);

	useEffect(() => {
		if (!intent) {
			return;
		}
		let cancelled = false;
		let attempts = 0;
		const poll = async () => {
			try {
				const nextPayment = await getPaymentStatus({
					data: { paymentIntentId: intent },
				});
				if (cancelled) {
					return;
				}
				setPayment(nextPayment);
				if (
					["succeeded", "failed", "orphaned", "refunded"].includes(
						nextPayment.status
					)
				) {
					return;
				}
			} catch {
				if (!cancelled) {
					setTimedOut(true);
				}
				return;
			}
			attempts += 1;
			if (attempts >= 30) {
				setTimedOut(true);
				return;
			}
			window.setTimeout(poll, 2000);
		};
		poll();
		return () => {
			cancelled = true;
		};
	}, [intent]);

	return (
		<>
			<SiteHeader />
			<main className="mx-auto min-h-[60vh] max-w-xl px-4 py-16" id="main">
				<section className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-card">
					<p className="rounded-lg bg-brand-50 px-3 py-2 text-brand-800 text-sm">
						Test mode — no real payment is taken.
					</p>
					<PaymentResult
						intent={intent}
						payment={payment}
						timedOut={timedOut}
					/>
				</section>
			</main>
			<SiteFooter />
		</>
	);
}

function PaymentResult({
	intent,
	payment,
	timedOut,
}: {
	intent: string;
	payment: PaymentStatus | null;
	timedOut: boolean;
}) {
	if (!intent) {
		return (
			<p className="mt-5 text-danger-500">Payment reference is missing.</p>
		);
	}
	if (payment?.status === "succeeded" && payment.booking) {
		return (
			<div className="mt-5">
				<h1 className="font-bold font-display text-2xl text-ink-900">
					Booking confirmed
				</h1>
				<p className="mt-2 text-ink-600">
					Your PNR is <strong>{payment.booking.pnr}</strong>.
				</p>
				<Link
					className="mt-5 inline-block font-semibold text-brand-600 hover:underline"
					to="/"
				>
					Back to home
				</Link>
			</div>
		);
	}
	if (payment?.status === "succeeded" && payment.purpose === "wallet_topup") {
		return (
			<div className="mt-5">
				<h1 className="font-bold font-display text-2xl text-ink-900">
					Wallet credited
				</h1>
				<p className="mt-2 text-ink-600">
					New balance: ₹{payment.balance?.toFixed(2) ?? "0.00"}
				</p>
				<Link
					className="mt-5 inline-block font-semibold text-brand-600 hover:underline"
					params={{ slug: "wallet-account" }}
					to="/p/$slug"
				>
					Open wallet
				</Link>
			</div>
		);
	}
	if (payment?.status === "failed") {
		return (
			<p className="mt-5 text-danger-500">
				{payment.failureReason ??
					"Payment failed. You can try again while your hold is active."}
			</p>
		);
	}
	if (timedOut) {
		return (
			<p className="mt-5 text-ink-600">
				We are confirming your payment. Keep this reference:{" "}
				<strong>{intent}</strong>.
			</p>
		);
	}
	return <p className="mt-5 text-ink-600">Confirming your payment…</p>;
}
