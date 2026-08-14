import { type FormEvent, useId } from "react";
import type { FormField, PageForm } from "#/data/page-forms";

const FIELD_CLASS =
	"w-full rounded-xl border border-ink-200 bg-surface px-3.5 py-2.5 text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-saffron-400";

// Renders a designed (concept) form for a transactional GSRTC page.
export function ActionForm({ form }: { form: PageForm }) {
	const submit = (event: FormEvent) => event.preventDefault();

	return (
		<div className="max-w-2xl">
			<form
				className="rounded-3xl border border-ink-100 bg-surface p-6 shadow-card sm:p-8"
				onSubmit={submit}
			>
				<div className="grid gap-4 sm:grid-cols-2">
					{form.fields.map((field) => (
						<Field field={field} key={field.name} />
					))}
				</div>

				{form.external ? (
					<a
						className="gradient-surface mt-6 inline-flex rounded-xl px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-105"
						href={form.external}
						rel="noopener"
						target="_blank"
					>
						{form.submit}
					</a>
				) : (
					<button
						className="gradient-surface mt-6 rounded-xl px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-105"
						type="submit"
					>
						{form.submit}
					</button>
				)}

				{form.note ? (
					<p className="mt-4 text-ink-500 text-sm">{form.note}</p>
				) : null}
			</form>
		</div>
	);
}

function Field({ field }: { field: FormField }) {
	const id = useId();
	const span = field.full || field.type === "textarea" ? "sm:col-span-2" : "";

	return (
		<label className={`block ${span}`} htmlFor={id}>
			<span className="mb-1.5 block font-medium text-ink-600 text-sm">
				{field.label}
			</span>
			{renderControl(field, id)}
		</label>
	);
}

function renderControl(field: FormField, id: string) {
	if (field.type === "textarea") {
		return (
			<textarea
				className={FIELD_CLASS}
				id={id}
				placeholder={field.placeholder}
				rows={4}
			/>
		);
	}
	if (field.type === "select") {
		return (
			<select className={FIELD_CLASS} defaultValue="" id={id}>
				<option disabled value="">
					Select…
				</option>
				{field.options?.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		);
	}
	return (
		<input
			className={FIELD_CLASS}
			id={id}
			placeholder={field.placeholder}
			type={field.type ?? "text"}
		/>
	);
}
