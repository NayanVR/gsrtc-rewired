import { type FormEvent, useRef, useState } from "react";
import { applyPass, getRefundStatus, raiseRefundComplaint } from "#/api/fns";
import type { PageForm, PageFormField } from "#/api/schemas";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Select } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { toAppError } from "#/lib/error-copy";

// Renders a designed (concept) form for a transactional GSRTC page. When the
// flow isn't owned by this build, `external` (the page's live OPRS URL) turns
// the CTA into a confirmed hand-off to gsrtc.in instead of an inert submit.
export function ActionForm({
	form,
	external,
	formId,
}: {
	form: PageForm;
	external?: string;
	formId?: string;
}) {
	const [feedback, setFeedback] = useState<string | null>(null);
	const isRefundForm =
		formId === "refund-complaint" || formId === "refund-transaction-enquiry";
	const isPassForm = formId === "new-commuter-bus-pass";
	const isInternalForm = isPassForm || isRefundForm;
	const portalUrl = isInternalForm ? undefined : (form.external ?? external);
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isInternalForm) {
			return;
		}
		setFeedback(null);
		const values = new FormData(event.currentTarget);
		try {
			if (isPassForm) {
				const type = formValue(values, "type");
				if (!isPassType(type)) {
					setFeedback("Choose a pass type before applying.");
					return;
				}
				const pass = await applyPass({
					data: {
						from: formValue(values, "from"),
						mobile: formValue(values, "mobile"),
						name: formValue(values, "name"),
						to: formValue(values, "to"),
						type,
					},
				});
				setFeedback(
					`Pass application submitted. Reference: ${pass.applicationNo}`
				);
				return;
			}
			if (formId === "refund-transaction-enquiry") {
				const refund = await getRefundStatus({
					data: {
						mobile: formValue(values, "mobile"),
						ref: formValue(values, "txn"),
					},
				});
				setFeedback(
					`Refund ${refund.ref} is ${refund.status}. Amount: ₹${refund.amount.toFixed(2)}${refund.expectedBy ? ` · expected by ${refund.expectedBy}` : ""}`
				);
				return;
			}
			const complaint = await raiseRefundComplaint({
				data: {
					email: formValue(values, "email"),
					message: formValue(values, "details"),
					mobile: formValue(values, "mobile"),
					ticketNo: formValue(values, "ticket"),
				},
			});
			setFeedback(`Complaint submitted. Reference: ${complaint.complaintId}`);
		} catch (error) {
			const appError = toAppError(error);
			setFeedback(`${appError.detail} ${appError.action}`);
		}
	};

	return (
		<div className="max-w-2xl">
			<form
				className="animate-fade-up rounded-3xl border border-ink-100 bg-surface p-6 shadow-card sm:p-8"
				onSubmit={submit}
			>
				<div className="grid gap-4 sm:grid-cols-2">
					{form.fields.map((field) => (
						<Field
							className={
								field.full || field.type === "textarea" ? "sm:col-span-2" : ""
							}
							key={field.name}
							label={field.label}
						>
							{(id) => <Control field={field} id={id} />}
						</Field>
					))}
				</div>

				{portalUrl ? (
					<LeaveToPortal label={form.submit} url={portalUrl} />
				) : (
					<Button className="mt-6" size="lg" type="submit">
						{form.submit}
					</Button>
				)}

				{form.note ? (
					<p className="mt-4 text-ink-500 text-sm">{form.note}</p>
				) : null}
				{feedback ? (
					<p aria-live="polite" className="mt-4 text-ink-700 text-sm">
						{feedback}
					</p>
				) : null}
			</form>
		</div>
	);
}

function formValue(values: FormData, name: string): string {
	const value = values.get(name);
	return typeof value === "string" ? value : "";
}

function isPassType(
	value: string
): value is "Daily" | "Monthly" | "Quarterly" | "Student" {
	return ["Daily", "Monthly", "Quarterly", "Student"].includes(value);
}

// The concept build doesn't own these transactional flows yet, so the button
// hands off to GSRTC's live portal — but only after the user confirms they're
// leaving. Uses the native <dialog> for a focus-trapped, Esc-dismissable modal.
function LeaveToPortal({ label, url }: { label: string; url: string }) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const { host } = new URL(url);

	const leave = () => {
		window.open(url, "_blank", "noopener,noreferrer");
		dialogRef.current?.close();
	};

	return (
		<>
			<Button
				className="mt-6"
				onClick={() => dialogRef.current?.showModal()}
				size="lg"
				type="button"
			>
				{label}
			</Button>

			<dialog
				aria-labelledby="leave-portal-title"
				className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-ink-100 bg-surface p-6 text-ink-800 shadow-pop backdrop:bg-ink-900/50"
				ref={dialogRef}
			>
				<h2
					className="font-bold font-display text-ink-900 text-lg"
					id="leave-portal-title"
				>
					Continue to the official GSRTC portal?
				</h2>
				<p className="mt-2 text-ink-600 text-sm">
					This opens <span className="font-semibold text-ink-800">{host}</span>{" "}
					in a new tab to complete your request on GSRTC's live portal.
				</p>
				<div className="mt-6 flex justify-end gap-3">
					<button
						className="rounded-xl border border-ink-200 px-5 py-2.5 font-semibold text-ink-700 text-sm transition hover:border-ink-300 hover:text-ink-900"
						onClick={() => dialogRef.current?.close()}
						type="button"
					>
						Cancel
					</button>
					<button
						className="gradient-surface inline-flex rounded-xl px-5 py-2.5 font-semibold text-sm text-white shadow-sm transition hover:brightness-105"
						onClick={leave}
						type="button"
					>
						Continue
					</button>
				</div>
			</dialog>
		</>
	);
}

function Control({ field, id }: { field: PageFormField; id: string }) {
	if (field.type === "textarea") {
		return (
			<Textarea id={id} name={field.name} placeholder={field.placeholder} />
		);
	}
	if (field.type === "select") {
		return (
			<Select defaultValue="" id={id} name={field.name}>
				<option disabled value="">
					Select…
				</option>
				{field.options?.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</Select>
		);
	}
	return (
		<Input
			id={id}
			name={field.name}
			placeholder={field.placeholder}
			type={field.type ?? "text"}
		/>
	);
}
