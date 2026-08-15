import { Button } from "#/components/ui/button";

const TRANSACTIONS = [
	{
		amount: -147,
		date: "12 Aug 2026",
		desc: "Ticket booking · Vadodara → Surat",
	},
	{ amount: 500, date: "08 Aug 2026", desc: "Wallet top-up · UPI" },
	{ amount: 120, date: "02 Aug 2026", desc: "Refund · cancelled ticket" },
	{
		amount: -220,
		date: "28 Jul 2026",
		desc: "Ticket booking · Ahmedabad → Rajkot",
	},
	{ amount: 1000, date: "21 Jul 2026", desc: "Wallet top-up · Netbanking" },
] as const;

const BALANCE = "₹1,253.00";

// Concept wallet UI. variant "account" shows balance + actions, "passbook"
// shows balance + a transaction ledger.
export function WalletPanel({ variant }: { variant: "account" | "passbook" }) {
	return (
		<div className="max-w-2xl space-y-6">
			<div className="mesh-hero relative overflow-hidden rounded-3xl p-6 text-white shadow-pop sm:p-7">
				<p className="text-sm text-white/70">Available balance</p>
				<p className="mt-1 font-bold font-display text-4xl tracking-tight">
					{BALANCE}
				</p>
				<p className="mt-4 text-sm text-white/70">
					Linked mobile · +91 63599 18237
				</p>
			</div>

			{variant === "account" ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Button size="lg">Add money</Button>
					<Button size="lg" variant="secondary">
						Manage KYC
					</Button>
				</div>
			) : (
				<div className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card">
					{TRANSACTIONS.map((txn) => (
						<div
							className="flex items-center justify-between border-ink-100 border-b px-4 py-3 last:border-b-0"
							key={`${txn.date}-${txn.desc}`}
						>
							<div>
								<p className="font-medium text-ink-800 text-sm">{txn.desc}</p>
								<p className="text-ink-400 text-xs">{txn.date}</p>
							</div>
							<span
								className={`font-semibold text-sm ${
									txn.amount < 0 ? "text-ink-700" : "text-brand-600"
								}`}
							>
								{txn.amount < 0 ? "−" : "+"}₹{Math.abs(txn.amount)}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
