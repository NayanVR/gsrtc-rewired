import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
	createBooking,
	getPaymentProvider,
	getSeatHold,
	getSeatMap,
	getTrip,
	holdSeats,
	startBookingPayment,
} from "#/api/fns";
import type {
	Passenger as ApiPassenger,
	Booking,
	Seat,
	Trip,
} from "#/api/schemas";
import {
	ArrowRightIcon,
	CheckIcon,
	ClockIcon,
	ShieldCheckIcon,
} from "#/components/icons";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { formatDuration, formatFare, formatTime } from "#/data/trips";
import type { PaymentMethod } from "#/lib/mock-payment";

interface BookSearch {
	date: string;
	passengers: number;
}

export const Route = createFileRoute("/book/$tripId")({
	validateSearch: (search: Record<string, unknown>): BookSearch => ({
		date:
			typeof search.date === "string"
				? search.date
				: new Date().toISOString().slice(0, 10),
		passengers: typeof search.passengers === "number" ? search.passengers : 1,
	}),
	loader: async ({ params }) => {
		try {
			const [trip, seatMap] = await Promise.all([
				getTrip({ data: params.tripId }),
				getSeatMap({ data: params.tripId }),
			]);
			return { seats: seatMap.seats, trip };
		} catch {
			// biome-ignore lint/style/useErrorCause: notFound() renders the 404 boundary; the underlying NOT_FOUND carries no user-facing detail
			throw notFound();
		}
	},
	component: BookPage,
});

const SERVICE_FEE = 15;
const SEATS_PER_ROW = 4;
const AISLE_AFTER = 2;

const TRIP_INFO_LINKS = [
	"Discounts",
	"Amenities",
	"Refreshment Stops",
	"Fare Summary",
] as const;

const SEAT_LEGEND = [
	{ className: "border-ink-300 bg-surface", label: "Available" },
	{ className: "border-transparent gradient-surface", label: "Selected" },
	{ className: "border-ink-200 bg-ink-200", label: "Booked" },
	{ className: "border-pink-400 bg-pink-100", label: "Ladies" },
] as const;

type PassengerGender = ApiPassenger["gender"];
type BookingStep = "details" | "payment-method" | "payment";

interface SeatHold {
	expiresAt: string;
	holdId: string;
}

interface BookingSession {
	bookingStep: Exclude<BookingStep, "details">;
	email: string;
	holdId: string;
	journalist: boolean;
	mobile: string;
	paymentMethod: PaymentMethod;
	people: Record<string, PassengerForm>;
}

interface PassengerForm {
	age: string;
	gender: PassengerGender;
	name: string;
}

function isPassengerGender(value: string): value is PassengerGender {
	return value === "male" || value === "female" || value === "other";
}

function toBookingPassengers(
	seatNos: string[],
	people: Record<string, PassengerForm>
): ApiPassenger[] | null {
	const passengers: ApiPassenger[] = [];
	for (const seatNo of seatNos) {
		const person = people[seatNo];
		const age = Number(person?.age);
		if (
			!person ||
			person.name.trim().length < 2 ||
			!Number.isInteger(age) ||
			age < 0 ||
			age > 120
		) {
			return null;
		}
		passengers.push({
			age,
			gender: person.gender,
			name: person.name.trim(),
			seatNo,
		});
	}
	return passengers;
}

function isSelectable(seat: Seat): boolean {
	return seat.status === "available" || seat.status === "ladies";
}

function formatHoldCountdown(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function remainingHoldSeconds(expiresAt: string): number {
	return Math.max(
		0,
		Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
	);
}

function isConflictError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}
	return "code" in error && error.code === "CONFLICT";
}

function refreshSeatMap(
	tripId: string,
	setSeatMap: (seats: Seat[]) => void
): void {
	getSeatMap({ data: tripId })
		.then((updatedMap) => setSeatMap(updatedMap.seats))
		.catch(() => undefined);
}

function bookingSessionKey(tripId: string): string {
	return `gsrtc-booking:${tripId}`;
}

function isBookingSession(value: unknown): value is BookingSession {
	if (!value || typeof value !== "object") {
		return false;
	}
	const session = value as Record<string, unknown>;
	return (
		(session.bookingStep === "payment-method" ||
			session.bookingStep === "payment") &&
		typeof session.email === "string" &&
		typeof session.holdId === "string" &&
		typeof session.journalist === "boolean" &&
		typeof session.mobile === "string" &&
		(session.paymentMethod === "upi" ||
			session.paymentMethod === "card" ||
			session.paymentMethod === "netbanking") &&
		typeof session.people === "object" &&
		session.people !== null
	);
}

function readBookingSession(tripId: string): BookingSession | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const stored = window.sessionStorage.getItem(bookingSessionKey(tripId));
		if (!stored) {
			return null;
		}
		const parsed = JSON.parse(stored) as unknown;
		return isBookingSession(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function writeBookingSession(tripId: string, session: BookingSession): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		window.sessionStorage.setItem(
			bookingSessionKey(tripId),
			JSON.stringify(session)
		);
	} catch {
		// A blocked browser storage area should not prevent the booking flow.
	}
}

function clearBookingSession(tripId: string): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		window.sessionStorage.removeItem(bookingSessionKey(tripId));
	} catch {
		// A blocked browser storage area has no persisted booking state to clear.
	}
}

function BookPage() {
	const { trip, seats } = Route.useLoaderData();
	const { date, passengers } = Route.useSearch();

	const [bookingStep, setBookingStep] = useState<BookingStep>("details");
	const [seatMap, setSeatMap] = useState(seats);
	const [selected, setSelected] = useState<string[]>([]);
	const [email, setEmail] = useState("");
	const [mobile, setMobile] = useState("");
	const [journalist, setJournalist] = useState(false);
	const [people, setPeople] = useState<Record<string, PassengerForm>>({});
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
	const [seatHold, setSeatHold] = useState<SeatHold | null>(null);
	const [remainingSeconds, setRemainingSeconds] = useState(0);
	const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(
		null
	);
	const [bookingError, setBookingError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [paymentProvider, setPaymentProvider] = useState<"dodo" | "mock">(
		"mock"
	);

	useEffect(() => {
		let cancelled = false;
		getPaymentProvider().then((provider) => {
			if (!cancelled) {
				setPaymentProvider(provider);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const saveProgress = (
		hold: SeatHold,
		step: Exclude<BookingStep, "details">,
		method = paymentMethod
	) => {
		writeBookingSession(trip.id, {
			bookingStep: step,
			email,
			holdId: hold.holdId,
			journalist,
			mobile,
			paymentMethod: method,
			people,
		});
	};

	const toggleSeat = (seat: Seat) => {
		if (!isSelectable(seat)) {
			return;
		}
		setSelected((current) => {
			if (current.includes(seat.no)) {
				return current.filter((no) => no !== seat.no);
			}
			if (current.length >= passengers) {
				return [...current.slice(1), seat.no];
			}
			return [...current, seat.no];
		});
	};

	const setPerson = (seatNo: string, patch: Partial<PassengerForm>) => {
		setPeople((current) => {
			const existing = current[seatNo] ?? {
				age: "",
				gender: "male",
				name: "",
			};
			return { ...current, [seatNo]: { ...existing, ...patch } };
		});
	};

	const selectPaymentMethod = (method: PaymentMethod) => {
		setPaymentMethod(method);
		if (seatHold && bookingStep !== "details") {
			saveProgress(seatHold, bookingStep, method);
		}
	};

	useEffect(() => {
		const savedSession = readBookingSession(trip.id);
		if (!savedSession) {
			return;
		}
		let cancelled = false;

		const restoreProgress = async () => {
			try {
				const activeHold = await getSeatHold({
					data: { holdId: savedSession.holdId, tripId: trip.id },
				});
				if (cancelled) {
					return;
				}
				setEmail(savedSession.email);
				setJournalist(savedSession.journalist);
				setMobile(savedSession.mobile);
				setPaymentMethod(savedSession.paymentMethod);
				setPeople(savedSession.people);
				setSelected(activeHold.seatNos);
				setSeatHold(activeHold);
				setRemainingSeconds(remainingHoldSeconds(activeHold.expiresAt));
				setBookingStep(savedSession.bookingStep);
			} catch {
				clearBookingSession(trip.id);
				refreshSeatMap(trip.id, setSeatMap);
			}
		};

		restoreProgress();
		return () => {
			cancelled = true;
		};
	}, [trip.id]);

	useEffect(() => {
		if (!seatHold) {
			return;
		}

		const updateCountdown = () => {
			const seconds = remainingHoldSeconds(seatHold.expiresAt);
			setRemainingSeconds(seconds);
			if (seconds !== 0) {
				return;
			}
			setSeatHold(null);
			setSelected([]);
			setPeople({});
			setBookingStep("details");
			clearBookingSession(trip.id);
			setBookingError(
				"Your 10-minute seat hold expired. Please choose your seats again."
			);
			refreshSeatMap(trip.id, setSeatMap);
		};

		updateCountdown();
		const interval = window.setInterval(updateCountdown, 1000);
		return () => window.clearInterval(interval);
	}, [seatHold, trip.id]);

	const seatFares = seatMap
		.filter((seat) => selected.includes(seat.no))
		.reduce((sum, seat) => sum + seat.fare, 0);
	const fees = selected.length * SERVICE_FEE;
	const total = seatFares + fees;
	const bookingPassengers = toBookingPassengers(selected, people);
	const canProceed =
		selected.length === passengers &&
		email !== "" &&
		mobile !== "" &&
		bookingPassengers !== null;

	const continueToPaymentMethod = () => {
		if (!bookingPassengers) {
			return;
		}
		setBookingError(null);
		setBookingStep("payment-method");
	};

	const lockSeats = async () => {
		if (!bookingPassengers || seatHold) {
			return;
		}
		setBookingError(null);
		setIsSubmitting(true);
		try {
			const hold = await holdSeats({
				data: { seatNos: selected, tripId: trip.id },
			});
			setSeatHold(hold);
			setRemainingSeconds(remainingHoldSeconds(hold.expiresAt));
			saveProgress(hold, "payment-method");
		} catch (error) {
			setBookingError(
				isConflictError(error)
					? "One or more selected seats were just taken. Please choose your seats again."
					: "We could not lock these seats. Please try again."
			);
			refreshSeatMap(trip.id, setSeatMap);
		} finally {
			setIsSubmitting(false);
		}
	};

	const continueToPayment = () => {
		if (!seatHold || remainingSeconds === 0) {
			return;
		}
		setBookingError(null);
		saveProgress(seatHold, "payment");
		setBookingStep("payment");
	};

	const returnToPaymentMethod = () => {
		if (seatHold) {
			saveProgress(seatHold, "payment-method");
		}
		setBookingStep("payment-method");
	};

	const submitPayment = async () => {
		if (!(bookingPassengers && seatHold) || remainingSeconds === 0) {
			return;
		}
		setBookingError(null);
		setIsSubmitting(true);
		try {
			if (paymentProvider === "dodo") {
				const payment = await startBookingPayment({
					data: {
						contact: { email, mobile },
						holdId: seatHold.holdId,
						passengers: bookingPassengers,
						tripId: trip.id,
					},
				});
				window.location.assign(payment.checkoutUrl);
				return;
			}
			const booking = await createBooking({
				data: {
					contact: { email, mobile },
					holdId: seatHold.holdId,
					paymentMethod,
					passengers: bookingPassengers,
					tripId: trip.id,
				},
			});
			setConfirmedBooking(booking);
			setSeatHold(null);
			clearBookingSession(trip.id);
		} catch (error) {
			setBookingError(
				isConflictError(error)
					? "This seat hold is no longer available. Please choose your seats again."
					: "We could not process this payment. Please try again before the hold expires."
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<SiteHeader />
			<main className="bg-canvas" id="main">
				<BookingBreadcrumb trip={trip} />
				<div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
					<div className="space-y-6">
						<TripSummary date={date} trip={trip} />
						<BookingStepIndicator step={bookingStep} />

						{bookingStep === "details" ? (
							<>
								<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
									<div className="flex items-center justify-between">
										<h2 className="font-bold font-display text-ink-900 text-lg">
											Select your seats
										</h2>
										<p className="text-ink-500 text-sm">
											{selected.length}/{passengers} chosen
										</p>
									</div>

									<SeatLegend />

									<div className="mt-5 overflow-x-auto">
										<SeatDeck
											onToggle={toggleSeat}
											seats={seatMap}
											selected={selected}
										/>
									</div>
								</section>

								<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
									<h2 className="font-bold font-display text-ink-900 text-lg">
										Passenger details
									</h2>
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										<TextField
											label="Email ID"
											onChange={setEmail}
											placeholder="you@example.com"
											required
											type="email"
											value={email}
										/>
										<TextField
											label="Mobile number"
											onChange={setMobile}
											placeholder="10-digit mobile"
											required
											type="tel"
											value={mobile}
										/>
									</div>

									<p className="mt-5 mb-2 font-semibold text-ink-700 text-sm">
										Traveller information
									</p>
									{selected.length === 0 ? (
										<p className="rounded-xl bg-canvas px-4 py-3 text-ink-500 text-sm">
											Select a seat above to add traveller details.
										</p>
									) : (
										<div className="space-y-3">
											{selected.map((seatNo) => {
												const person = people[seatNo];
												return (
													<div
														className="grid gap-2 rounded-xl border border-ink-100 bg-canvas p-3 sm:grid-cols-[auto_1fr_5rem_7rem]"
														key={seatNo}
													>
														<span className="grid place-items-center rounded-lg bg-ink-900 px-3 font-semibold text-sm text-white">
															Seat {seatNo}
														</span>
														<input
															aria-label={`Name for seat ${seatNo}`}
															className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
															onChange={(e) =>
																setPerson(seatNo, { name: e.target.value })
															}
															placeholder="Full name"
															value={person?.name ?? ""}
														/>
														<input
															aria-label={`Age for seat ${seatNo}`}
															className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
															onChange={(e) =>
																setPerson(seatNo, { age: e.target.value })
															}
															placeholder="Age"
															type="number"
															value={person?.age ?? ""}
														/>
														<select
															aria-label={`Gender for seat ${seatNo}`}
															className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
															onChange={(e) =>
																isPassengerGender(e.target.value)
																	? setPerson(seatNo, {
																			gender: e.target.value,
																		})
																	: undefined
															}
															value={person?.gender ?? "male"}
														>
															<option value="male">Male</option>
															<option value="female">Female</option>
															<option value="other">Other</option>
														</select>
													</div>
												);
											})}
										</div>
									)}

									<label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-ink-600 text-sm">
										<input
											checked={journalist}
											className="h-4 w-4 rounded border-ink-300 accent-saffron-500"
											onChange={(e) => setJournalist(e.target.checked)}
											type="checkbox"
										/>
										Are you a Journalist?
									</label>
								</section>
							</>
						) : null}

						{bookingStep === "payment-method" ? (
							<PaymentMethodStep
								disabled={isSubmitting}
								hostedCheckout={paymentProvider === "dodo"}
								onSelect={selectPaymentMethod}
								paymentMethod={paymentMethod}
								seatHold={seatHold}
							/>
						) : null}

						{bookingStep === "payment" ? (
							<PaymentConfirmation
								hostedCheckout={paymentProvider === "dodo"}
								onBack={returnToPaymentMethod}
								paymentMethod={paymentMethod}
								selectedSeats={selected}
							/>
						) : null}

						<div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-ink-100 bg-surface px-5 py-3">
							{TRIP_INFO_LINKS.map((label) => (
								<button
									className="font-medium text-brand-600 text-sm hover:text-brand-700 hover:underline"
									key={label}
									type="button"
								>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Fare summary */}
					<aside className="lg:sticky lg:top-24 lg:h-fit">
						<div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-card">
							<h2 className="font-bold font-display text-ink-900 text-lg">
								Fare summary
							</h2>

							<div className="mt-4 space-y-3 text-sm">
								<SummaryRow
									label={`Seats (${selected.length})`}
									value={formatFare(seatFares)}
								/>
								<SummaryRow label="Service fee" value={formatFare(fees)} />
								<div className="border-ink-100 border-t pt-3">
									<SummaryRow
										bold
										label="Total payable"
										value={formatFare(total)}
									/>
								</div>
							</div>

							{selected.length > 0 ? (
								<div className="mt-4 rounded-xl bg-saffron-50 px-3 py-2.5 text-saffron-800 text-xs">
									Seats{" "}
									<span className="font-semibold">
										{[...selected]
											.sort((a, b) => Number(a) - Number(b))
											.join(", ")}
									</span>
								</div>
							) : null}

							{seatHold ? (
								<div className="mt-4 rounded-xl bg-success-50 px-3 py-3 text-sm text-success-700">
									<p className="font-semibold">Seats locked for you</p>
									<p className="mt-1">
										Complete payment in {formatHoldCountdown(remainingSeconds)}.
									</p>
								</div>
							) : null}

							<BookingPrimaryAction
								bookingStep={bookingStep}
								canProceed={canProceed}
								confirmedBooking={confirmedBooking}
								isSubmitting={isSubmitting}
								onContinueToPayment={continueToPayment}
								onContinueToPaymentMethod={continueToPaymentMethod}
								onLockSeats={lockSeats}
								onSubmitPayment={submitPayment}
								remainingSeconds={remainingSeconds}
								seatHold={seatHold}
								total={total}
							/>
							{bookingError ? (
								<p
									aria-live="assertive"
									className="mt-3 text-error-600 text-sm"
								>
									{bookingError}
								</p>
							) : null}

							<div className="mt-4 space-y-2 text-ink-500 text-xs">
								<p className="flex items-start gap-1.5">
									<ShieldCheckIcon
										className="mt-0.5 shrink-0 text-success-500"
										height={14}
										width={14}
									/>
									Note 1: Once seats are locked, complete payment within 10
									minutes, or the seat is released for other passengers.
								</p>
								<p className="pl-5">
									Note 2: E-Wallet — provide a valid email &amp; mobile to
									create or retrieve your wallet.
								</p>
							</div>
						</div>
					</aside>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}

function BookingStepIndicator({ step }: { step: BookingStep }) {
	const steps: { id: BookingStep; label: string }[] = [
		{ id: "details", label: "Seats & details" },
		{ id: "payment-method", label: "Payment method" },
		{ id: "payment", label: "Payment" },
	];
	const activeIndex = steps.findIndex((item) => item.id === step);

	return (
		<nav aria-label="Booking progress">
			<ol className="grid grid-cols-3 gap-2 rounded-2xl border border-ink-100 bg-surface p-3">
				{steps.map((item, index) => {
					const isActive = index === activeIndex;
					const isComplete = index < activeIndex;
					return (
						<li
							className={`rounded-xl px-2 py-2 text-center font-semibold text-xs sm:text-sm ${getStepClassName(isActive, isComplete)}`}
							key={item.id}
						>
							{index + 1}. {item.label}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

function getStepClassName(isActive: boolean, isComplete: boolean): string {
	if (isActive) {
		return "gradient-surface text-white";
	}
	if (isComplete) {
		return "bg-success-50 text-success-700";
	}
	return "text-ink-400";
}

function BookingPrimaryAction({
	bookingStep,
	canProceed,
	confirmedBooking,
	isSubmitting,
	onContinueToPayment,
	onContinueToPaymentMethod,
	onLockSeats,
	onSubmitPayment,
	remainingSeconds,
	seatHold,
	total,
}: {
	bookingStep: BookingStep;
	canProceed: boolean;
	confirmedBooking: Booking | null;
	isSubmitting: boolean;
	onContinueToPayment: () => void;
	onContinueToPaymentMethod: () => void;
	onLockSeats: () => void;
	onSubmitPayment: () => void;
	remainingSeconds: number;
	seatHold: SeatHold | null;
	total: number;
}) {
	const buttonClassName =
		"gradient-surface mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50";

	if (confirmedBooking) {
		return (
			<div
				aria-live="polite"
				className="mt-5 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700"
			>
				Booking confirmed. PNR:{" "}
				<span className="font-semibold">{confirmedBooking.pnr}</span>
			</div>
		);
	}

	if (bookingStep === "details") {
		return (
			<button
				className={buttonClassName}
				disabled={!canProceed}
				onClick={onContinueToPaymentMethod}
				type="button"
			>
				Continue to payment method
				{canProceed ? <ArrowRightIcon height={18} width={18} /> : null}
			</button>
		);
	}

	if (bookingStep === "payment-method" && !seatHold) {
		return (
			<button
				className={buttonClassName}
				disabled={isSubmitting}
				onClick={onLockSeats}
				type="button"
			>
				{isSubmitting ? "Locking seats…" : "Lock seats for 10 minutes"}
				{isSubmitting ? null : <ArrowRightIcon height={18} width={18} />}
			</button>
		);
	}

	if (bookingStep === "payment-method") {
		return (
			<button
				className={buttonClassName}
				disabled={remainingSeconds === 0}
				onClick={onContinueToPayment}
				type="button"
			>
				Continue to payment
				<ArrowRightIcon height={18} width={18} />
			</button>
		);
	}

	return (
		<button
			className={buttonClassName}
			disabled={!seatHold || remainingSeconds === 0 || isSubmitting}
			onClick={onSubmitPayment}
			type="button"
		>
			{isSubmitting ? "Processing payment…" : `Pay ${formatFare(total)}`}
			{isSubmitting ? null : <ArrowRightIcon height={18} width={18} />}
		</button>
	);
}

function PaymentMethodStep({
	disabled,
	hostedCheckout,
	onSelect,
	paymentMethod,
	seatHold,
}: {
	disabled: boolean;
	hostedCheckout: boolean;
	onSelect: (method: PaymentMethod) => void;
	paymentMethod: PaymentMethod;
	seatHold: SeatHold | null;
}) {
	const methods: { description: string; id: PaymentMethod; label: string }[] = [
		{ description: "Pay from any UPI app", id: "upi", label: "UPI" },
		{ description: "Debit or credit card", id: "card", label: "Card" },
		{
			description: "Use your internet banking account",
			id: "netbanking",
			label: "Net banking",
		},
	];

	return (
		<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
			<h2 className="font-bold font-display text-ink-900 text-lg">
				{hostedCheckout ? "Secure checkout" : "Choose payment method"}
			</h2>
			<p className="mt-1 text-ink-500 text-sm">
				Your seats are checked and locked only when you continue from this step.
			</p>
			{hostedCheckout ? (
				<p className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-brand-800 text-sm">
					Test mode — no real payment is taken. You will choose a payment method
					on Dodo’s secure checkout page.
				</p>
			) : (
				<div className="mt-5 grid gap-3 sm:grid-cols-3">
					{methods.map((method) => {
						const selected = method.id === paymentMethod;
						return (
							<button
								aria-pressed={selected}
								className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${
									selected
										? "border-brand-500 bg-brand-50 text-brand-800"
										: "border-ink-200 text-ink-700 hover:border-saffron-400"
								}`}
								disabled={disabled}
								key={method.id}
								onClick={() => onSelect(method.id)}
								type="button"
							>
								<span className="block font-semibold">{method.label}</span>
								<span className="mt-1 block text-ink-500 text-xs">
									{method.description}
								</span>
							</button>
						);
					})}
				</div>
			)}
			{seatHold ? (
				<p className="mt-5 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">
					Your seats are locked. Continue to the payment page before the timer
					expires.
				</p>
			) : null}
		</section>
	);
}

function PaymentConfirmation({
	hostedCheckout,
	onBack,
	paymentMethod,
	selectedSeats,
}: {
	hostedCheckout: boolean;
	onBack: () => void;
	paymentMethod: PaymentMethod;
	selectedSeats: string[];
}) {
	const paymentLabels: Record<PaymentMethod, string> = {
		card: "Card",
		netbanking: "Net banking",
		upi: "UPI",
	};

	return (
		<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="font-bold font-display text-ink-900 text-lg">
						Payment confirmation
					</h2>
					<p className="mt-1 text-ink-500 text-sm">
						Review the payment details, then complete your booking.
					</p>
				</div>
				{hostedCheckout ? null : (
					<button
						className="font-semibold text-brand-600 text-sm hover:underline"
						onClick={onBack}
						type="button"
					>
						Change method
					</button>
				)}
			</div>
			<div className="mt-5 grid gap-3 rounded-xl bg-canvas p-4 text-sm sm:grid-cols-2">
				{hostedCheckout ? null : (
					<div>
						<p className="text-ink-500 text-xs">Payment method</p>
						<p className="mt-1 font-semibold text-ink-900">
							{paymentLabels[paymentMethod]}
						</p>
					</div>
				)}
				<div>
					<p className="text-ink-500 text-xs">Seats</p>
					<p className="mt-1 font-semibold text-ink-900">
						{[...selectedSeats]
							.sort((a, b) => Number(a) - Number(b))
							.join(", ")}
					</p>
				</div>
			</div>
			<p className="mt-4 text-ink-500 text-xs">
				{hostedCheckout
					? "Test mode — no real payment is taken. Your booking is confirmed only after Dodo verifies payment."
					: "Payments are simulated in this concept build. The selected method is included in the booking request."}
			</p>
		</section>
	);
}

function BookingBreadcrumb({ trip }: { trip: Trip }) {
	return (
		<div className="border-ink-100 border-b bg-surface">
			<div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 text-sm sm:px-6">
				<Link className="text-ink-500 hover:text-saffron-600" to="/">
					Home
				</Link>
				<span className="text-ink-300">/</span>
				<Link
					className="text-ink-500 hover:text-saffron-600"
					search={{
						date: new Date().toISOString().slice(0, 10),
						from: trip.from,
						passengers: 1,
						to: trip.to,
					}}
					to="/search"
				>
					{trip.from} → {trip.to}
				</Link>
				<span className="text-ink-300">/</span>
				<span className="font-semibold text-ink-800">Select seats</span>
			</div>
		</div>
	);
}

function TripSummary({ trip, date }: { trip: Trip; date: string }) {
	return (
		<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700 text-xs">
					{trip.busType}
				</span>
				<span className="font-mono text-ink-400 text-xs">{trip.id}</span>
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
				<div>
					<p className="font-bold font-display text-2xl text-ink-900">
						{formatTime(trip.departure)}
					</p>
					<p className="text-ink-500 text-xs">{trip.from}</p>
				</div>
				<div className="flex items-center gap-2 text-ink-400">
					<span className="inline-flex items-center gap-1 text-xs">
						<ClockIcon height={13} width={13} />
						{formatDuration(trip.durationMin)}
					</span>
					<ArrowRightIcon height={16} width={16} />
				</div>
				<div>
					<p className="font-bold font-display text-2xl text-ink-900">
						{formatTime(trip.arrival)}
					</p>
					<p className="text-ink-500 text-xs">{trip.to}</p>
				</div>
				<div className="ml-auto text-right">
					<p className="text-ink-500 text-xs">Journey date</p>
					<p className="font-semibold text-ink-800">
						{new Date(date).toLocaleDateString("en-IN", {
							day: "numeric",
							month: "short",
							weekday: "short",
							year: "numeric",
						})}
					</p>
				</div>
			</div>
		</section>
	);
}

function SeatLegend() {
	return (
		<div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
			{SEAT_LEGEND.map((item) => (
				<span
					className="inline-flex items-center gap-2 text-ink-600 text-xs"
					key={item.label}
				>
					<span
						aria-hidden
						className={`h-4 w-4 rounded border ${item.className}`}
					/>
					{item.label}
				</span>
			))}
		</div>
	);
}

function chunkRows(seats: Seat[]): Seat[][] {
	const rows: Seat[][] = [];
	for (let i = 0; i < seats.length; i += SEATS_PER_ROW) {
		rows.push(seats.slice(i, i + SEATS_PER_ROW));
	}
	return rows;
}

function SeatDeck({
	seats,
	selected,
	onToggle,
}: {
	seats: Seat[];
	selected: string[];
	onToggle: (seat: Seat) => void;
}) {
	const decks = useMemo(() => {
		const byDeck = new Map<Seat["deck"], Seat[]>();
		for (const seat of seats) {
			const list = byDeck.get(seat.deck) ?? [];
			list.push(seat);
			byDeck.set(seat.deck, list);
		}
		return [...byDeck.entries()];
	}, [seats]);

	return (
		<div className="inline-block rounded-2xl border border-ink-100 bg-canvas p-4">
			<div className="mb-3 flex items-center justify-end gap-1.5 text-ink-400 text-xs">
				<SteeringIcon />
				Driver
			</div>
			<div className="flex gap-8">
				{decks.map(([deck, deckSeats]) => (
					<div key={deck}>
						{decks.length > 1 ? (
							<p className="mb-2 font-semibold text-ink-500 text-xs capitalize">
								{deck} deck
							</p>
						) : null}
						<div className="space-y-2">
							{chunkRows(deckSeats).map((row, rowIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and stable
								<div className="flex items-center gap-2" key={rowIndex}>
									{row.map((seat, seatIndex) => (
										<Fragment key={seat.no}>
											<SeatButton
												onToggle={onToggle}
												seat={seat}
												selected={selected.includes(seat.no)}
											/>
											{seatIndex === AISLE_AFTER - 1 ? (
												<span aria-hidden className="w-5" />
											) : null}
										</Fragment>
									))}
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function SeatButton({
	seat,
	selected,
	onToggle,
}: {
	seat: Seat;
	selected: boolean;
	onToggle: (seat: Seat) => void;
}) {
	const unavailable = seat.status === "booked" || seat.status === "held";
	const isLadies = seat.status === "ladies";

	let styles =
		"border-ink-300 bg-surface text-ink-700 hover:border-saffron-400";
	if (selected) {
		styles = "gradient-surface border-transparent text-white";
	} else if (unavailable) {
		styles = "cursor-not-allowed border-ink-200 bg-ink-200 text-ink-400";
	} else if (isLadies) {
		styles = "border-pink-400 bg-pink-100 text-pink-700 hover:border-pink-500";
	}

	const label = unavailable
		? `Seat ${seat.no}, unavailable`
		: `Seat ${seat.no}, ${isLadies ? "ladies, " : ""}${
				selected ? "selected" : "available"
			}`;

	return (
		<button
			aria-label={label}
			aria-pressed={selected}
			className={`grid h-9 w-9 place-items-center rounded-lg border font-semibold text-xs transition ${styles}`}
			disabled={unavailable}
			onClick={() => onToggle(seat)}
			type="button"
		>
			{selected ? <CheckIcon height={16} width={16} /> : seat.no}
		</button>
	);
}

function SteeringIcon() {
	return (
		<svg
			aria-hidden
			fill="none"
			height={16}
			stroke="currentColor"
			strokeWidth={1.8}
			viewBox="0 0 24 24"
			width={16}
		>
			<circle cx="12" cy="12" r="9" />
			<circle cx="12" cy="12" r="2.5" />
			<path d="M12 14.5V21M9.8 11 4 8.5M14.2 11 20 8.5" />
		</svg>
	);
}

function TextField({
	label,
	value,
	onChange,
	placeholder,
	type,
	required,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: string;
	required?: boolean;
}) {
	return (
		<label className="block">
			<span className="mb-1.5 block font-semibold text-ink-700 text-sm">
				{label}
				{required ? <span className="text-saffron-600"> *</span> : null}
			</span>
			<input
				className="w-full rounded-xl border border-ink-200 bg-canvas px-3.5 py-2.5 text-ink-900 outline-none transition focus-visible:border-saffron-400 focus-visible:bg-surface"
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				type={type ?? "text"}
				value={value}
			/>
		</label>
	);
}

function SummaryRow({
	label,
	value,
	bold,
}: {
	label: string;
	value: string;
	bold?: boolean;
}) {
	return (
		<div className="flex items-center justify-between">
			<span className={bold ? "font-bold text-ink-900" : "text-ink-600"}>
				{label}
			</span>
			<span
				className={
					bold
						? "font-display font-extrabold text-ink-900 text-lg"
						: "font-semibold text-ink-800"
				}
			>
				{value}
			</span>
		</div>
	);
}
