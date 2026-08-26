export interface BookingPassengerInput {
	age: string;
	gender: string;
	name: string;
}

export interface BookingDetailsInput {
	email: string;
	mobile: string;
	passengers: number;
	people: Record<string, BookingPassengerInput | undefined>;
	selected: string[];
}

export interface BookingFieldErrors {
	email?: string;
	mobile?: string;
	passengers?: Record<string, string>;
	seats?: string;
}

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_NUMBER = /^\d{10}$/;

export function validateBookingDetails(
	input: BookingDetailsInput
): BookingFieldErrors {
	const errors: BookingFieldErrors = {};
	if (input.selected.length !== input.passengers) {
		errors.seats = "Select the requested number of seats.";
	}
	if (!EMAIL_ADDRESS.test(input.email.trim())) {
		errors.email = "Enter a valid email address.";
	}
	if (!MOBILE_NUMBER.test(input.mobile.trim())) {
		errors.mobile = "Enter a 10-digit mobile number.";
	}
	const passengerErrors: Record<string, string> = {};
	for (const seatNo of input.selected) {
		const passenger = input.people[seatNo];
		const age = Number(passenger?.age);
		if (
			!passenger ||
			passenger.name.trim().length < 2 ||
			passenger.age.trim() === "" ||
			!Number.isInteger(age) ||
			age < 0 ||
			age > 120
		) {
			passengerErrors[seatNo] =
				"Enter a valid name and age for this traveller.";
		}
	}
	if (Object.keys(passengerErrors).length > 0) {
		errors.passengers = passengerErrors;
	}
	return errors;
}
