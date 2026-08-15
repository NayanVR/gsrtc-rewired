// Minimal, dependency-free class combiner with the same call signature as
// shadcn's `cn`. When publishing these components with shadcn, swap the body
// for `twMerge(clsx(inputs))` — call sites won't change.
type ClassValue = string | number | false | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
	const out: string[] = [];
	for (const value of inputs) {
		if (!value) {
			continue;
		}
		if (Array.isArray(value)) {
			out.push(cn(...value));
		} else {
			out.push(String(value));
		}
	}
	return out.join(" ");
}
