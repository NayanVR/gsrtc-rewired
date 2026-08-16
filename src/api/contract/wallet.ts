import * as v from "valibot";
import { base } from "#/api/contract/base";
import { PageInput, Rupees, Transaction, WalletAccount } from "#/api/schemas";

export const wallet = {
	account: base
		.route({
			method: "GET",
			path: "/wallet/account",
			summary: "Wallet account",
		})
		.output(WalletAccount),

	passbook: base
		.route({ method: "GET", path: "/wallet/passbook", summary: "Passbook" })
		.input(PageInput)
		.output(v.object({ balance: Rupees, transactions: v.array(Transaction) })),

	topUp: base
		.route({ method: "POST", path: "/wallet/topup", summary: "Add money" })
		.input(
			v.object({
				amount: v.pipe(Rupees, v.minValue(10)),
				method: v.picklist(["upi", "card", "netbanking"]),
			})
		)
		.output(v.object({ balance: Rupees, transactionId: v.string() })),
};
