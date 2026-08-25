import { createServerFn } from "@tanstack/react-start";
import { api } from "#/api/server";
import { isValidMobileNumber } from "#/lib/auth-identity";
import { getPaymentsProvider } from "#/lib/dodo";
import { getDevelopmentOtp as readDevelopmentOtp } from "#/lib/mock-otp-delivery";

// The client↔server boundary. Each server function wraps a contract call; the
// handler body runs only on the server (the compiler strips it and the `api`
// import from the browser bundle) and the front-end calls these isomorphically.

export const listCities = createServerFn()
	.validator((q: string | undefined) => q)
	.handler(({ data }) => api.search.cities({ q: data }));

export const getContentPage = createServerFn()
	.validator((data: { slug: string }) => data)
	.handler(({ data }) => api.content.page(data));

export const searchTrips = createServerFn()
	.validator(
		(d: { date: string; from: string; passengers: number; to: string }) => d
	)
	.handler(({ data }) => api.search.trips(data));

export const getTrip = createServerFn()
	.validator((tripId: string) => tripId)
	.handler(({ data }) => api.booking.trip({ tripId: data }));

export const getSeatMap = createServerFn()
	.validator((tripId: string) => tripId)
	.handler(({ data }) => api.booking.seatMap({ tripId: data }));

export const holdSeats = createServerFn()
	.validator((data: { seatNos: string[]; tripId: string }) => data)
	.handler(({ data }) => api.booking.hold(data));

export const getSeatHold = createServerFn()
	.validator((data: { holdId: string; tripId: string }) => data)
	.handler(({ data }) => api.booking.holdStatus(data));

export const createBooking = createServerFn()
	.validator(
		(data: {
			contact: { email?: string; mobile: string };
			holdId: string;
			paymentMethod?: "upi" | "card" | "netbanking";
			passengers: {
				age: number;
				gender: "male" | "female" | "other";
				name: string;
				seatNo: string;
			}[];
			singleLady?: boolean;
			tripId: string;
		}) => data
	)
	.handler(({ data }) => api.booking.create(data));

export const startBookingPayment = createServerFn()
	.validator(
		(data: {
			contact: { email?: string; mobile: string };
			holdId: string;
			passengers: {
				age: number;
				gender: "male" | "female" | "other";
				name: string;
				seatNo: string;
			}[];
			singleLady?: boolean;
			tripId: string;
		}) => data
	)
	.handler(({ data }) => api.booking.startPayment(data));

export const getPaymentStatus = createServerFn()
	.validator((data: { paymentIntentId: string }) => data)
	.handler(({ data }) => api.booking.paymentStatus(data));

export const getPaymentProvider = createServerFn().handler(() =>
	getPaymentsProvider()
);

export const getBooking = createServerFn()
	.validator((data: { mobile: string; pnr: string }) => data)
	.handler(({ data }) => api.booking.get(data));

export const getRefundStatus = createServerFn()
	.validator((data: { mobile: string; ref: string }) => data)
	.handler(({ data }) => api.refunds.status(data));

export const raiseRefundComplaint = createServerFn()
	.validator(
		(data: {
			email: string;
			message: string;
			mobile: string;
			ticketNo: string;
		}) => data
	)
	.handler(({ data }) => api.refunds.complaint(data));

export const applyPass = createServerFn()
	.validator(
		(data: {
			from: string;
			mobile: string;
			name: string;
			photoRef?: string;
			to: string;
			type: "Daily" | "Monthly" | "Quarterly" | "Student";
		}) => data
	)
	.handler(({ data }) => api.passes.apply(data));

export const renewPass = createServerFn()
	.validator((data: { passNo: string }) => data)
	.handler(({ data }) => api.passes.renew(data));

export const getPassStatus = createServerFn()
	.validator((data: { applicationNo: string }) => data)
	.handler(({ data }) => api.passes.status(data));

export const getWalletAccount = createServerFn().handler(() =>
	api.wallet.account()
);

export const getWalletPassbook = createServerFn()
	.validator((data: { page?: number; pageSize?: number }) => data)
	.handler(({ data }) => api.wallet.passbook(data));

export const topUpWallet = createServerFn()
	.validator(
		(data: { amount: number; method: "upi" | "card" | "netbanking" }) => data
	)
	.handler(({ data }) => api.wallet.topUp(data));

export const startWalletTopUp = createServerFn()
	.validator((data: { amount: number }) => data)
	.handler(({ data }) => api.wallet.startTopUp(data));

export const trackJourney = createServerFn()
	.validator((vehicleNo: string) => vehicleNo)
	.handler(({ data }) => api.tracking.progress({ vehicleNo: data }));

// This is deliberately outside the public API contract. It exists only for
// local development and deployments explicitly configured with mock OTP mode.
export const getDevelopmentOtp = createServerFn()
	.validator((phoneNumber: string) => phoneNumber)
	.handler(({ data }) => {
		if (!isValidMobileNumber(data)) {
			throw new Error("Enter a 10-digit mobile number.");
		}
		const code = readDevelopmentOtp(data);
		if (!code) {
			throw new Error("A development OTP is not available.");
		}
		return { code };
	});
