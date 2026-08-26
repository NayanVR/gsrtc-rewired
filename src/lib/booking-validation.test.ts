import { describe, expect, it } from "vitest";
import { validateBookingDetails } from "#/lib/booking-validation";
import { MESSAGES } from "#/lib/i18n";

const valid = {
	email: "traveller@example.com",
	mobile: "9876543210",
	passengers: 1,
	people: { A1: { age: "30", gender: "male", name: "Asha Patel" } },
	selected: ["A1"],
};

describe("validateBookingDetails", () => {
	it("reports only an invalid mobile number", () => {
		expect(validateBookingDetails({ ...valid, mobile: "987654321" })).toEqual({
			mobile: "Enter a 10-digit mobile number.",
		});
	});

	it("reports only a malformed email address", () => {
		expect(validateBookingDetails({ ...valid, email: "not-an-email" })).toEqual(
			{ email: "Enter a valid email address." }
		);
	});

	it("keys incomplete passenger errors by seat", () => {
		expect(
			validateBookingDetails({
				...valid,
				people: { A1: { ...valid.people.A1, age: "" } },
			})
		).toEqual({
			passengers: { A1: "Enter a valid name and age for this traveller." },
		});
	});

	it("reports a seat count mismatch", () => {
		expect(validateBookingDetails({ ...valid, passengers: 2 })).toEqual({
			seats: "Select the requested number of seats.",
		});
	});

	it("accepts complete booking details", () => {
		expect(validateBookingDetails(valid)).toEqual({});
	});

	it("returns translated-copy keys", () => {
		const errors = validateBookingDetails({
			...valid,
			email: "bad",
			mobile: "bad",
			passengers: 2,
			people: { A1: { ...valid.people.A1, age: "" } },
		});
		const messages = [
			errors.email,
			errors.mobile,
			errors.seats,
			...Object.values(errors.passengers ?? {}),
		];
		for (const message of messages) {
			expect(MESSAGES.gu[message]).toBeTruthy();
			expect(MESSAGES.hi[message]).toBeTruthy();
		}
	});
});
