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
import { ErrorPanel } from "#/components/error-panel";
import {
	ArrowRightIcon,
	CheckIcon,
	ClockIcon,
	ShieldCheckIcon,
} from "#/components/icons";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { formatDuration, formatFare, formatTime } from "#/data/trips";
import { validateBookingDetails } from "#/lib/booking-validation";
import { type AppError, toAppError } from "#/lib/error-copy";
import { useTranslation } from "#/lib/i18n";
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
		} catch (error) {
			if (isNotFoundError(error)) {
				throw notFound();
			}
			throw error;
		}
	},
	component: BookPage,
	errorComponent: BookingRouteError,
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
			person.age.trim() === "" ||
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

function isNotFoundError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}
	return "code" in error && error.code === "NOT_FOUND";
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
	const { t } = useTranslation();
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
	const [bookingError, setBookingError] = useState<AppError | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [paymentProvider, setPaymentProvider] = useState<"dodo" | "mock">(
		"mock"
	);
	const [detailsSubmitted, setDetailsSubmitted] = useState(false);
	const [touchedDetails, setTouchedDetails] = useState<Record<string, boolean>>(
		{}
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
			} catch (error) {
				clearBookingSession(trip.id);
				refreshSeatMap(trip.id, setSeatMap);
				setBookingError(toAppError(error));
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
				toAppError({ code: "NOT_FOUND", data: { reason: "hold_expired" } })
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
	const detailsErrors = useMemo(
		() =>
			validateBookingDetails({ email, mobile, passengers, people, selected }),
		[email, mobile, passengers, people, selected]
	);
	const canProceed = Object.keys(detailsErrors).length === 0;
	const seatError = detailsSubmitted ? detailsErrors.seats : undefined;
	const showError = (name: string) => detailsSubmitted || touchedDetails[name];
	const markTouched = (name: string) =>
		setTouchedDetails((current) => ({ ...current, [name]: true }));

	const continueToPaymentMethod = () => {
		setDetailsSubmitted(true);
		if (!(canProceed && bookingPassengers)) {
			requestAnimationFrame(() => {
				document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
			});
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
			saveProgress(hold, "payment");
			setBookingStep("payment");
		} catch (error) {
			setBookingError(toAppError(error));
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
						contact: { email: email.trim(), mobile: mobile.trim() },
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
					contact: { email: email.trim(), mobile: mobile.trim() },
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
			setBookingError(toAppError(error));
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
											error={Boolean(seatError)}
											errorId="booking-seats-error"
											onToggle={toggleSeat}
											seats={seatMap}
											selected={selected}
										/>
									</div>
									{seatError ? (
										<p
											className="mt-2 text-destructive text-sm"
											id="booking-seats-error"
											role="alert"
										>
											{t(seatError)}
										</p>
									) : null}
								</section>

								<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
									<h2 className="font-bold font-display text-ink-900 text-lg">
										Passenger details
									</h2>
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										<Field
											error={
												showError("email")
													? t(detailsErrors.email ?? "")
													: undefined
											}
											label="Email ID"
											required
										>
											{(props) => (
												<Input
													{...props}
													onBlur={() => markTouched("email")}
													onChange={(event) => setEmail(event.target.value)}
													placeholder="you@example.com"
													required
													type="email"
													value={email}
												/>
											)}
										</Field>
										<Field
											error={
												showError("mobile")
													? t(detailsErrors.mobile ?? "")
													: undefined
											}
											label="Mobile number"
											required
										>
											{(props) => (
												<Input
													{...props}
													onBlur={() => markTouched("mobile")}
													onChange={(event) => setMobile(event.target.value)}
													placeholder="10-digit mobile"
													required
													type="tel"
													value={mobile}
												/>
											)}
										</Field>
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
											{/* The row coordinates three controls and one shared field error. */}
											{/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: field wiring is kept adjacent for accessibility. */}
											{selected.map((seatNo) => {
												const person = people[seatNo];
												const passengerError =
													detailsErrors.passengers?.[seatNo];
												const passengerErrorId = `passenger-${seatNo}-error`;
												const showPassengerError = showError(
													`passenger-${seatNo}`
												);
												return (
													<div
														className="grid gap-2 rounded-xl border border-ink-100 bg-canvas p-3 sm:grid-cols-[auto_1fr_5rem_7rem]"
														key={seatNo}
													>
														<span className="grid place-items-center rounded-lg bg-ink-900 px-3 font-semibold text-sm text-white">
															Seat {seatNo}
														</span>
														<input
															aria-describedby={
																showPassengerError && passengerError
																	? passengerErrorId
																	: undefined
															}
															aria-invalid={
																showPassengerError && passengerError
																	? true
																	: undefined
															}
															aria-label={`Name for seat ${seatNo}`}
															className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
															onBlur={() => markTouched(`passenger-${seatNo}`)}
															onChange={(e) =>
																setPerson(seatNo, { name: e.target.value })
															}
															placeholder="Full name"
															value={person?.name ?? ""}
														/>
														<input
															aria-describedby={
																showPassengerError && passengerError
																	? passengerErrorId
																	: undefined
															}
															aria-invalid={
																showPassengerError && passengerError
																	? true
																	: undefined
															}
															aria-label={`Age for seat ${seatNo}`}
															className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
															onBlur={() => markTouched(`passenger-${seatNo}`)}
															onChange={(e) =>
																setPerson(seatNo, { age: e.target.value })
															}
															placeholder="Age"
															type="number"
															value={person?.age ?? ""}
														/>
														<select
															aria-describedby={
																showPassengerError && passengerError
																	? passengerErrorId
																	: undefined
															}
															aria-invalid={
																showPassengerError && passengerError
																	? true
																	: undefined
															}
															aria-label={`Gender for seat ${seatNo}`}
															className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
															onBlur={() => markTouched(`passenger-${seatNo}`)}
															onChange={(e) =>
																isPassengerGender(e.target.value)
																	? setPerson(seatNo, {
																			gender: e.target.value,
																		})
																	: undefined
															}
															value={person ? person.gender : "male"}
														>
															<option value="male">Male</option>
															<option value="female">Female</option>
															<option value="other">Other</option>
														</select>
														{showPassengerError && passengerError ? (
															<p
																className="text-destructive text-sm sm:col-span-4"
																id={passengerErrorId}
																role="alert"
															>
																{t(passengerError)}
															</p>
														) : null}
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
								<div className="mt-3">
									<ErrorPanel error={bookingError} />
								</div>
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
									Note 2: For E-Wallet, provide a valid email &amp; mobile to
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

function BookingRouteError({ error }: { error: unknown }) {
	return (
		<>
			<SiteHeader />
			<main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-10" id="main">
				<ErrorPanel error={toAppError(error)} />
				<Link
					className="mt-5 inline-block font-semibold text-brand-700 hover:underline"
					to="/"
				>
					Return to search
				</Link>
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
			<Button
				className="mt-5 w-full"
				onClick={onContinueToPaymentMethod}
				type="button"
			>
				Continue to payment method
				<ArrowRightIcon height={18} width={18} />
			</Button>
		);
	}

	if (bookingStep === "payment-method" && !seatHold) {
		return (
			<Button
				className="mt-5 w-full"
				disabled={isSubmitting}
				loading={isSubmitting}
				onClick={onLockSeats}
				type="button"
			>
				Continue to payment
				{isSubmitting ? null : <ArrowRightIcon height={18} width={18} />}
			</Button>
		);
	}

	if (bookingStep === "payment-method") {
		return (
			<Button
				className="mt-5 w-full"
				disabled={remainingSeconds === 0}
				onClick={onContinueToPayment}
				type="button"
			>
				Continue to payment
				<ArrowRightIcon height={18} width={18} />
			</Button>
		);
	}

	return (
		<Button
			className="mt-5 w-full"
			disabled={!seatHold || remainingSeconds === 0 || isSubmitting}
			onClick={onSubmitPayment}
			type="button"
		>
			loading={isSubmitting}
			{`Pay ${formatFare(total)}`}
			{isSubmitting ? null : <ArrowRightIcon height={18} width={18} />}
		</Button>
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
				Your seats will be checked and locked when you continue to payment.
			</p>
			{hostedCheckout ? (
				<p className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-brand-800 text-sm">
					Test mode. No real payment is taken. You will choose a payment method
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
					? "Test mode. No real payment is taken. Your booking is confirmed only after Dodo verifies payment."
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
	error,
	errorId,
}: {
	seats: Seat[];
	selected: string[];
	onToggle: (seat: Seat) => void;
	error: boolean;
	errorId: string;
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
		<div
			aria-describedby={error ? errorId : undefined}
			aria-invalid={error || undefined}
			className="inline-block rounded-2xl border border-ink-100 bg-canvas p-4 aria-invalid:border-destructive"
			tabIndex={error ? -1 : undefined}
		>
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
