import type { AppError } from "#/lib/error-copy";
import { useTranslation } from "#/lib/i18n";

export function ErrorPanel({ error }: { error: AppError }) {
	const { t } = useTranslation();
	return (
		<section
			className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-4 text-danger-700"
			role="alert"
		>
			<h2 className="font-semibold">{t(error.title)}</h2>
			<p className="mt-1 text-sm">{t(error.detail)}</p>
			<p className="mt-2 font-medium text-sm">
				{t(error.action, { traceId: error.traceId ?? "—" })}
			</p>
			{!error.recoverable && error.traceId ? (
				<p className="mt-2 select-all font-mono text-xs">{error.traceId}</p>
			) : null}
		</section>
	);
}
