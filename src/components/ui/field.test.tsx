// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";

afterEach(cleanup);

describe("Field", () => {
	it("connects an invalid control to its error message", () => {
		render(
			<Field error="Enter a valid value." label="Reference">
				{(props) => <Input {...props} />}
			</Field>
		);

		const input = screen.getByRole("textbox");
		const error = screen.getByRole("alert");
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.getAttribute("aria-describedby")).toBe(error.id);
		expect(error.textContent).toBe("Enter a valid value.");
	});

	it("does not add error attributes when the field is valid", () => {
		render(<Field label="Reference">{(props) => <Input {...props} />}</Field>);

		const input = screen.getByRole("textbox");
		expect(input.getAttribute("aria-invalid")).toBeNull();
		expect(input.getAttribute("aria-describedby")).toBeNull();
	});
});

describe("Button", () => {
	it("allows callers to override its default radius", () => {
		render(<Button className="rounded-full">Continue</Button>);

		const button = screen.getByRole("button");
		expect(button.classList.contains("rounded-full")).toBe(true);
		expect(button.classList.contains("rounded-xl")).toBe(false);
	});
});
