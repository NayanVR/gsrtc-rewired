import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
	cancelTicket,
	getTicketHistory,
	printTicket,
	rescheduleTicket,
} from "#/api/fns";
import type { Booking } from "#/api/schemas";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

const MONEY_FORMATTER = new Intl.NumberFormat("en-IN", {
	currency: "INR",
	minimumFractionDigits: 2,
	style: "currency",
});

function formatError(cause: unknown, fallback: string): string {
	return cause instanceof Error && cause.message ? cause.message : fallback;
}

function ticketStatusClass(status: Booking["status"]): string {
	if (status === "confirmed") {
		return "bg-success-500/10 text-success-700";
	}
	if (status === "cancelled") {
		return "bg-danger-500/10 text-danger-500";
	}
	return "bg-saffron-500/10 text-saffron-700";
}

function CancellationControls({
	confirming,
	disabled,
	isCancelling,
	onCancel,
	onKeep,
	onStart,
	ticketNo,
}: {
	confirming: boolean;
	disabled: boolean;
	isCancelling: boolean;
	onCancel: (ticketNo: string) => Promise<void>;
	onKeep: () => void;
	onStart: () => void;
	ticketNo: string;
}) {
	if (!confirming) {
		return (
			<button
				className="px-2 py-1 font-semibold text-danger-500 text-sm hover:text-danger-600"
				onClick={onStart}
				type="button"
			>
				Cancel ticket
			</button>
		);
	}

	return (
		<>
			<Button
				disabled={disabled}
				onClick={() => onCancel(ticketNo)}
				size="sm"
				variant="secondary"
			>
				{isCancelling ? "Cancelling…" : "Confirm cancellation"}
			</Button>
			<button
				className="px-2 py-1 font-semibold text-ink-600 text-sm hover:text-ink-900"
				onClick={onKeep}
				type="button"
			>
				Keep ticket
			</button>
		</>
	);
}

function RescheduleControls({
	disabled,
	isRescheduling,
	onReschedule,
	ticketNo,
}: {
	disabled: boolean;
	isRescheduling: boolean;
	onReschedule: (ticketNo: string, newDate: string) => Promise<void>;
	ticketNo: string;
}) {
	const [open, setOpen] = useState(false);
	const dateId = `reschedule-${ticketNo}`;

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const newDate = String(formData.get("newDate") ?? "");
		await onReschedule(ticketNo, newDate);
		setOpen(false);
	};

	if (!open) {
		return (
			<button
				className="px-2 py-1 font-semibold text-brand-700 text-sm hover:text-brand-800"
				disabled={disabled}
				onClick={() => setOpen(true)}
				type="button"
			>
				Reschedule journey
			</button>
		);
	}

	return (
		<form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
			<label
				className="grid gap-1 font-medium text-ink-600 text-xs"
				htmlFor={dateId}
			>
				New journey date
				<input
					className="rounded-lg border border-ink-200 bg-surface px-2 py-1.5 text-ink-800 text-sm"
					id={dateId}
					min={new Date().toISOString().slice(0, 10)}
					name="newDate"
					required
					type="date"
				/>
			</label>
			<Button disabled={disabled} size="sm" type="submit" variant="secondary">
				{isRescheduling ? "Rescheduling…" : "Confirm date"}
			</Button>
			<button
				className="px-2 py-1 font-semibold text-ink-600 text-sm hover:text-ink-900"
				disabled={disabled}
				onClick={() => setOpen(false)}
				type="button"
			>
				Cancel
			</button>
		</form>
	);
}

function TicketCard({
	booking,
	mobile,
	onCancel,
	onReschedule,
	onSend,
	pendingAction,
}: {
	booking: Booking;
	mobile: string;
	onCancel: (ticketNo: string) => Promise<void>;
	onReschedule: (ticketNo: string, newDate: string) => Promise<void>;
	onSend: (ticketNo: string) => Promise<void>;
	pendingAction: string | null;
}) {
	const [confirmingCancellation, setConfirmingCancellation] = useState(false);
	const isCancelling = pendingAction === `cancel:${booking.pnr}`;
	const isRescheduling = pendingAction === `reschedule:${booking.pnr}`;
	const isSending = pendingAction === `send:${booking.pnr}`;
	const canCancel = booking.status === "confirmed";

	return (
		<article className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-card">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="font-bold font-display text-ink-900 text-lg">
						{booking.from} <span className="text-ink-400">→</span> {booking.to}
					</p>
					<p className="mt-1 text-ink-500 text-sm">
						{booking.journeyDate} · PNR {booking.pnr}
					</p>
				</div>
				<span
					className={`rounded-full px-3 py-1 font-semibold text-xs capitalize ${ticketStatusClass(booking.status)}`}
				>
					{booking.status}
				</span>
			</div>

			<div className="mt-4 grid gap-3 border-ink-100 border-y py-4 text-sm sm:grid-cols-3">
				<p className="text-ink-600">
					<span className="block text-ink-400 text-xs">Seats</span>
					{booking.passengers.map((passenger) => passenger.seatNo).join(", ")}
				</p>
				<p className="text-ink-600">
					<span className="block text-ink-400 text-xs">Passengers</span>
					{booking.passengers.length}
				</p>
				<p className="font-semibold text-ink-800">
					<span className="block font-normal text-ink-400 text-xs">Paid</span>
					{MONEY_FORMATTER.format(booking.amountPaid)}
				</p>
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-3">
				<Button
					disabled={isSending || isCancelling}
					onClick={() => onSend(booking.pnr)}
					size="sm"
					variant="secondary"
				>
					{isSending ? "Sending…" : `Send ticket to ${mobile}`}
				</Button>
				{canCancel ? (
					<RescheduleControls
						disabled={isSending || isCancelling || isRescheduling}
						isRescheduling={isRescheduling}
						onReschedule={onReschedule}
						ticketNo={booking.pnr}
					/>
				) : null}
				{canCancel ? (
					<CancellationControls
						confirming={confirmingCancellation}
						disabled={isCancelling || isRescheduling || isSending}
						isCancelling={isCancelling}
						onCancel={onCancel}
						onKeep={() => setConfirmingCancellation(false)}
						onStart={() => setConfirmingCancellation(true)}
						ticketNo={booking.pnr}
					/>
				) : null}
			</div>
		</article>
	);
}

export function ProfilePanel({
	mobile,
	name,
}: {
	mobile?: string;
	name: string;
}) {
	const navigate = useNavigate();
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [loading, setLoading] = useState(Boolean(mobile));
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [signingOut, setSigningOut] = useState(false);

	const signOut = async () => {
		setError("");
		setNotice("");
		setSigningOut(true);
		try {
			const result = await authClient.signOut();
			if (result.error) {
				setError(
					result.error.message ?? "We could not sign you out. Try again."
				);
				return;
			}
			await navigate({ to: "/" });
		} catch (cause) {
			setError(formatError(cause, "We could not sign you out. Try again."));
		} finally {
			setSigningOut(false);
		}
	};

	const loadBookings = useCallback(async () => {
		if (!mobile) {
			return;
		}
		setLoading(true);
		setError("");
		try {
			const result = await getTicketHistory({ data: { mobile } });
			setBookings(result.bookings);
		} catch (cause) {
			setError(formatError(cause, "We could not load your tickets."));
		} finally {
			setLoading(false);
		}
	}, [mobile]);

	useEffect(() => {
		loadBookings();
	}, [loadBookings]);

	const sendTicket = async (ticketNo: string) => {
		if (!mobile) {
			return;
		}
		setPendingAction(`send:${ticketNo}`);
		setError("");
		setNotice("");
		try {
			const result = await printTicket({
				data: { channel: "sms", mobile, ticketNo },
			});
			setNotice(
				result.sent
					? `Ticket ${ticketNo} was sent to ${mobile}.`
					: "We could not send the ticket. Try again."
			);
		} catch (cause) {
			setError(formatError(cause, "We could not send the ticket."));
		} finally {
			setPendingAction(null);
		}
	};

	const cancelBooking = async (ticketNo: string) => {
		if (!mobile) {
			return;
		}
		setPendingAction(`cancel:${ticketNo}`);
		setError("");
		setNotice("");
		try {
			const result = await cancelTicket({ data: { mobile, ticketNo } });
			setNotice(
				`Ticket ${ticketNo} cancelled. Refund amount: ${MONEY_FORMATTER.format(result.refundAmount)}.`
			);
			await loadBookings();
		} catch (cause) {
			setError(
				formatError(cause, "This ticket could not be cancelled right now.")
			);
		} finally {
			setPendingAction(null);
		}
	};

	const rescheduleBooking = async (ticketNo: string, newDate: string) => {
		if (!mobile) {
			return;
		}
		setPendingAction(`reschedule:${ticketNo}`);
		setError("");
		setNotice("");
		try {
			const booking = await rescheduleTicket({
				data: { mobile, newDate, ticketNo },
			});
			setNotice(`Ticket ${ticketNo} rescheduled to ${booking.journeyDate}.`);
			await loadBookings();
		} catch (cause) {
			setError(
				formatError(cause, "This ticket could not be rescheduled right now.")
			);
		} finally {
			setPendingAction(null);
		}
	};

	if (!mobile) {
		return (
			<div className="max-w-2xl rounded-2xl border border-saffron-500/20 bg-saffron-50 p-5 text-ink-700 shadow-card">
				<h2 className="font-bold font-display text-ink-900 text-xl">
					Add a mobile number to see tickets
				</h2>
				<p className="mt-2 text-sm">
					{name}, tickets are linked to the mobile number used when booking.
					Sign in with mobile OTP to view and manage them here.
				</p>
				<Link
					className="mt-4 inline-flex font-semibold text-brand-700 text-sm hover:underline"
					to="/login"
				>
					Sign in with mobile OTP
				</Link>
				<Button
					className="ml-4"
					disabled={signingOut}
					onClick={signOut}
					size="sm"
					variant="secondary"
				>
					{signingOut ? "Signing out…" : "Sign out"}
				</Button>
			</div>
		);
	}

	return (
		<div className="max-w-3xl space-y-5">
			<div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-ink-100 bg-surface p-5 shadow-card">
				<div>
					<p className="text-ink-500 text-sm">Signed in as</p>
					<p className="mt-1 font-bold font-display text-ink-900 text-xl">
						{name}
					</p>
					<p className="mt-1 text-ink-600 text-sm">{mobile}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						disabled={loading}
						onClick={loadBookings}
						size="sm"
						variant="secondary"
					>
						Refresh tickets
					</Button>
					<Button
						disabled={signingOut}
						onClick={signOut}
						size="sm"
						variant="secondary"
					>
						{signingOut ? "Signing out…" : "Sign out"}
					</Button>
				</div>
			</div>

			{error ? (
				<p className="text-danger-500 text-sm" role="alert">
					{error}
				</p>
			) : null}
			{notice ? (
				<p aria-live="polite" className="text-sm text-success-700">
					{notice}
				</p>
			) : null}

			<TicketList
				bookings={bookings}
				loading={loading}
				mobile={mobile}
				onCancel={cancelBooking}
				onReschedule={rescheduleBooking}
				onSend={sendTicket}
				pendingAction={pendingAction}
			/>
		</div>
	);
}

function TicketList({
	bookings,
	loading,
	mobile,
	onCancel,
	onReschedule,
	onSend,
	pendingAction,
}: {
	bookings: Booking[];
	loading: boolean;
	mobile: string;
	onCancel: (ticketNo: string) => Promise<void>;
	onReschedule: (ticketNo: string, newDate: string) => Promise<void>;
	onSend: (ticketNo: string) => Promise<void>;
	pendingAction: string | null;
}) {
	if (loading) {
		return <p className="text-ink-600">Loading your tickets…</p>;
	}
	if (bookings.length) {
		return (
			<div className="space-y-4">
				{bookings.map((booking) => (
					<TicketCard
						booking={booking}
						key={booking.pnr}
						mobile={mobile}
						onCancel={onCancel}
						onReschedule={onReschedule}
						onSend={onSend}
						pendingAction={pendingAction}
					/>
				))}
			</div>
		);
	}
	return (
		<div className="rounded-2xl border border-ink-200 border-dashed bg-surface p-8 text-center shadow-card">
			<h2 className="font-bold font-display text-ink-900 text-xl">
				No tickets yet
			</h2>
			<p className="mt-2 text-ink-500 text-sm">
				Your confirmed and past bookings will appear here.
			</p>
			<Link
				className="mt-4 inline-flex font-semibold text-brand-700 text-sm hover:underline"
				to="/"
			>
				Find a bus
			</Link>
		</div>
	);
}
