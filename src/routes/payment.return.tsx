import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPaymentStatus } from "#/api/fns";
import { ErrorPanel } from "#/components/error-panel";
import {
	ArrowRightIcon,
	CalendarIcon,
	CheckIcon,
	PinIcon,
	TicketIcon,
	UsersIcon,
} from "#/components/icons";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { Button } from "#/components/ui/button";
import { formatFare } from "#/data/trips";
import { toAppError } from "#/lib/error-copy";

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
	const [pnrCopied, setPnrCopied] = useState(false);

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
			} catch (error) {
				if (!cancelled) {
					setTimedOut(toAppError(error).code === "INTERNAL");
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
			<main className="min-h-[60vh] bg-canvas px-4 py-10 sm:py-16" id="main">
				<section className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-ink-100 bg-surface shadow-pop">
					<PaymentResult
						intent={intent}
						onCopyPnr={async (pnr) => {
							await navigator.clipboard?.writeText(pnr);
							setPnrCopied(true);
						}}
						payment={payment}
						pnrCopied={pnrCopied}
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
	onCopyPnr,
	payment,
	pnrCopied,
	timedOut,
}: {
	intent: string;
	onCopyPnr: (pnr: string) => Promise<void>;
	payment: PaymentStatus | null;
	pnrCopied: boolean;
	timedOut: boolean;
}) {
	if (!intent) {
		return (
			<div className="p-7 sm:p-9">
				<p className="text-danger-500">Payment reference is missing.</p>
			</div>
		);
	}
	if (payment?.status === "succeeded" && payment.booking) {
		return (
			<BookingConfirmation
				booking={payment.booking}
				onCopyPnr={onCopyPnr}
				pnrCopied={pnrCopied}
			/>
		);
	}
	if (payment?.status === "succeeded" && payment.purpose === "wallet_topup") {
		return (
			<div className="p-7 sm:p-9">
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
		const error = toAppError({
			code: "PAYMENT_FAILED",
			data: { reason: payment.failureReason },
		});
		return (
			<div className="p-7 sm:p-9">
				<ErrorPanel error={error} />
			</div>
		);
	}
	if (timedOut) {
		return (
			<p className="p-7 text-ink-600 sm:p-9">
				We are confirming your payment. Keep this reference:{" "}
				<strong>{intent}</strong>
			</p>
		);
	}
	return <p className="p-7 text-ink-600 sm:p-9">Confirming your payment…</p>;
}

function BookingConfirmation({
	booking,
	onCopyPnr,
	pnrCopied,
}: {
	booking: NonNullable<PaymentStatus["booking"]>;
	onCopyPnr: (pnr: string) => Promise<void>;
	pnrCopied: boolean;
}) {
	const journeyDate = new Intl.DateTimeFormat("en-IN", {
		day: "numeric",
		month: "short",
		weekday: "long",
		year: "numeric",
	}).format(new Date(`${booking.journeyDate}T00:00:00`));

	return (
		<>
			<div className="relative overflow-hidden bg-ink-900 px-7 py-9 text-white sm:px-9">
				<div
					aria-hidden
					className="absolute -top-16 -right-12 h-52 w-52 rounded-full bg-saffron-400/20 blur-2xl"
				/>
				<div
					aria-hidden
					className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-brand-400/25 blur-2xl"
				/>
				<div className="relative flex items-start gap-4">
					<div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-success-400 text-ink-950 shadow-lg shadow-success-400/20">
						<CheckIcon height={28} strokeWidth={2.7} width={28} />
					</div>
					<div>
						<p className="font-semibold text-sm text-success-300">
							Payment successful
						</p>
						<h1 className="mt-1 font-bold font-display text-3xl tracking-tight sm:text-4xl">
							You’re going places.
						</h1>
						<p className="mt-2 max-w-md text-sm text-white/70 sm:text-base">
							Your GSRTC ticket is confirmed and ready for your journey.
						</p>
					</div>
				</div>
			</div>

			<div className="p-7 sm:p-9">
				<p className="mb-3 rounded-xl bg-brand-50 px-4 py-3 text-brand-800 text-sm">
					Test mode. No real payment is taken.
				</p>
				<div className="rounded-2xl border border-ink-100 bg-canvas p-5">
					<div className="flex items-center justify-between gap-4">
						<div className="min-w-0">
							<p className="font-medium text-ink-500 text-xs uppercase tracking-[0.16em]">
								Booking reference
							</p>
							<p className="mt-1 truncate font-bold font-mono text-2xl text-ink-900 tracking-wide sm:text-3xl">
								{booking.pnr}
							</p>
						</div>
						<button
							aria-label="Copy PNR"
							className="rounded-xl border border-ink-200 bg-surface px-3 py-2 font-semibold text-brand-700 text-sm transition hover:border-brand-200 hover:bg-brand-50"
							onClick={() => onCopyPnr(booking.pnr)}
							type="button"
						>
							{pnrCopied ? "Copied" : "Copy"}
						</button>
					</div>
				</div>

				<div className="my-6 border-ink-100 border-t border-dashed" />
				<div className="grid gap-5 sm:grid-cols-2">
					<BookingDetail
						icon={<PinIcon />}
						label="Journey"
						value={`${booking.from} → ${booking.to}`}
					/>
					<BookingDetail
						icon={<CalendarIcon />}
						label="Date of journey"
						value={journeyDate}
					/>
					<BookingDetail
						icon={<UsersIcon />}
						label="Passengers"
						value={`${booking.passengers.length} ${booking.passengers.length === 1 ? "passenger" : "passengers"}`}
					/>
					<BookingDetail
						icon={<TicketIcon />}
						label="Amount paid"
						value={formatFare(booking.amountPaid)}
					/>
				</div>

				<div className="mt-7 flex flex-col gap-3 sm:flex-row">
					<Button asChild className="flex-1" size="lg">
						<Link to="/">
							Book another journey <ArrowRightIcon height={18} width={18} />
						</Link>
					</Button>
					<Link
						className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 px-5 py-3 font-semibold text-ink-700 transition hover:bg-canvas"
						params={{ slug: "print-sms-ticket" }}
						to="/p/$slug"
					>
						<TicketIcon height={18} width={18} /> Print or SMS ticket
					</Link>
				</div>
				<p className="mt-5 text-center text-ink-500 text-xs">
					Keep this PNR handy when you travel.
				</p>
			</div>
		</>
	);
}

function BookingDetail({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="flex gap-3">
			<div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-saffron-50 text-saffron-700">
				{icon}
			</div>
			<div>
				<p className="text-ink-500 text-xs">{label}</p>
				<p className="mt-0.5 font-semibold text-ink-800 text-sm">{value}</p>
			</div>
		</div>
	);
}
