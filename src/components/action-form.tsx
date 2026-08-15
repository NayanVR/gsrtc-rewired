import type { FormEvent } from "react";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Select } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import type { FormField, PageForm } from "#/data/page-forms";

// Renders a designed (concept) form for a transactional GSRTC page.
export function ActionForm({ form }: { form: PageForm }) {
	const submit = (event: FormEvent) => event.preventDefault();

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

				{form.external ? (
					<a
						className="gradient-surface mt-6 inline-flex rounded-xl px-6 py-3 font-semibold text-white shadow-sm transition-[transform,filter] duration-150 hover:brightness-105 active:scale-[0.97]"
						href={form.external}
						rel="noopener"
						target="_blank"
					>
						{form.submit}
					</a>
				) : (
					<Button className="mt-6" size="lg" type="submit">
						{form.submit}
					</Button>
				)}

				{form.note ? (
					<p className="mt-4 text-ink-500 text-sm">{form.note}</p>
				) : null}
			</form>
		</div>
	);
}

function Control({ field, id }: { field: FormField; id: string }) {
	if (field.type === "textarea") {
		return <Textarea id={id} placeholder={field.placeholder} />;
	}
	if (field.type === "select") {
		return (
			<Select defaultValue="" id={id}>
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
			placeholder={field.placeholder}
			type={field.type ?? "text"}
		/>
	);
}
