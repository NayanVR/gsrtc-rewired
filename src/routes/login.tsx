import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { getDevelopmentOtp } from "#/api/fns";
import { PageShell } from "#/components/page-shell";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { isSyntheticPhoneEmail } from "#/lib/auth-identity";
import { useTranslation } from "#/lib/i18n";

export const Route = createFileRoute("/login")({ component: LoginPage });

type Mode = "signIn" | "signUp";
type SignInMethod = "email" | "mobile";

function submitLabel(
	mode: Mode,
	submitting: boolean,
	t: (message: string) => string
): string {
	if (submitting) {
		return mode === "signUp" ? t("Creating account…") : t("Signing in…");
	}
	return mode === "signUp" ? t("Create account") : t("Sign in");
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This screen keeps both auth methods and their mutually exclusive UI states together.
function LoginPage() {
	const { t } = useTranslation();
	const { data: currentSession, isPending: sessionPending } =
		authClient.useSession();
	const [mode, setMode] = useState<Mode>("signIn");
	const [signInMethod, setSignInMethod] = useState<SignInMethod>("email");
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [otpSentFor, setOtpSentFor] = useState<string | null>(null);
	const [developmentOtp, setDevelopmentOtp] = useState<string | null>(null);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "");
		const password = String(formData.get("password") ?? "");
		const name = String(formData.get("name") ?? "");

		setError("");
		setNotice("");
		setSubmitting(true);
		try {
			const result =
				mode === "signUp"
					? await authClient.signUp.email({ email, name, password })
					: await authClient.signIn.email({ email, password });
			if (result.error) {
				setError(
					result.error.message ?? "We could not sign you in. Try again."
				);
				return;
			}
			setNotice(
				mode === "signUp"
					? "Your account is ready. You are signed in."
					: "You are signed in."
			);
		} catch {
			setError("We could not complete that request. Try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const sendOtp = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const phoneNumber = String(formData.get("mobile") ?? "").trim();

		setError("");
		setNotice("");
		setDevelopmentOtp(null);
		setSubmitting(true);
		try {
			const result = await authClient.phoneNumber.sendOtp({ phoneNumber });
			if (result.error) {
				setError(
					result.error.message ?? "We could not send an OTP. Try again."
				);
				return;
			}
			setOtpSentFor(phoneNumber);
			setNotice("OTP sent. Enter the code to sign in.");
			if (import.meta.env.DEV) {
				const { code } = await getDevelopmentOtp({ data: phoneNumber });
				setDevelopmentOtp(code);
			}
		} catch {
			setError("We could not send an OTP. Try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!otpSentFor) {
			return;
		}
		const formData = new FormData(event.currentTarget);
		const code = String(formData.get("otp") ?? "");

		setError("");
		setNotice("");
		setSubmitting(true);
		try {
			const result = await authClient.phoneNumber.verify({
				code,
				phoneNumber: otpSentFor,
			});
			if (result.error) {
				setError(result.error.message ?? "That OTP could not be verified.");
				return;
			}
			setDevelopmentOtp(null);
			setNotice("Your mobile number is verified. You are signed in.");
		} catch {
			setError("That OTP could not be verified. Try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const signOut = async () => {
		setError("");
		setNotice("");
		setSubmitting(true);
		try {
			const result = await authClient.signOut();
			if (result.error) {
				setError(
					result.error.message ?? "We could not sign you out. Try again."
				);
				return;
			}
			setNotice("You are signed out.");
		} catch {
			setError("We could not sign you out. Try again.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<PageShell
			blurb="Sign in with your email and password, or use a one-time password sent to your mobile."
			title="Passenger sign in"
		>
			<div className="mx-auto max-w-md rounded-2xl border border-ink-100 bg-surface p-6 shadow-card sm:p-8">
				{currentSession?.user ? (
					<div className="space-y-4">
						<div>
							<h2 className="font-bold font-display text-ink-900 text-xl">
								{t("You are signed in")}
							</h2>
							<p className="mt-1 text-ink-600 text-sm">
								{isSyntheticPhoneEmail(currentSession.user.email)
									? t("Mobile account")
									: `${currentSession.user.name} · ${currentSession.user.email}`}
							</p>
						</div>
						<Button disabled={submitting} onClick={signOut} variant="secondary">
							{submitting ? t("Signing out…") : t("Sign out")}
						</Button>
					</div>
				) : (
					<>
						<div
							aria-label={t("Sign-in method")}
							className="grid grid-cols-2 rounded-xl bg-canvas p-1"
							role="tablist"
						>
							<Button
								aria-selected={signInMethod === "email"}
								className={
									signInMethod === "email"
										? "rounded-lg bg-surface text-ink-900 shadow-sm hover:bg-surface"
										: "rounded-lg"
								}
								onClick={() => setSignInMethod("email")}
								role="tab"
								variant="ghost"
							>
								{t("Email & password")}
							</Button>
							<Button
								aria-selected={signInMethod === "mobile"}
								className={
									signInMethod === "mobile"
										? "rounded-lg bg-surface text-ink-900 shadow-sm hover:bg-surface"
										: "rounded-lg"
								}
								onClick={() => setSignInMethod("mobile")}
								role="tab"
								variant="ghost"
							>
								{t("Mobile OTP")}
							</Button>
						</div>

						{signInMethod === "email" ? (
							<form className="mt-6 space-y-4" onSubmit={submit}>
								<div className="flex items-start justify-between gap-4">
									<div>
										<h2 className="font-bold font-display text-ink-900 text-xl">
											{mode === "signUp"
												? t("Create your account")
												: t("Welcome back")}
										</h2>
										<p className="mt-1 text-ink-500 text-sm">
											{mode === "signUp"
												? t("Use an email address and a secure password.")
												: t("Sign in with your registered email address.")}
										</p>
									</div>
									<button
										className="shrink-0 font-semibold text-brand-700 text-sm hover:text-brand-800 hover:underline"
										onClick={() =>
											setMode((currentMode) =>
												currentMode === "signIn" ? "signUp" : "signIn"
											)
										}
										type="button"
									>
										{mode === "signUp"
											? t("Sign in instead")
											: t("Create account")}
									</button>
								</div>
								{mode === "signUp" ? (
									<Field label={t("Full name")}>
										{(id) => (
											<Input
												autoComplete="name"
												id={id}
												minLength={2}
												name="name"
												required
											/>
										)}
									</Field>
								) : null}

								<Field label={t("Email address")}>
									{(id) => (
										<Input
											autoComplete="email"
											id={id}
											name="email"
											required
											type="email"
										/>
									)}
								</Field>

								<Field label={t("Password")}>
									{(id) => (
										<Input
											autoComplete={
												mode === "signUp" ? "new-password" : "current-password"
											}
											id={id}
											minLength={8}
											name="password"
											required
											type="password"
										/>
									)}
								</Field>

								<Button
									className="w-full"
									disabled={submitting || sessionPending}
									type="submit"
								>
									{submitLabel(mode, submitting, t)}
								</Button>
							</form>
						) : (
							<div className="mt-6 space-y-4">
								<div>
									<h2 className="font-bold font-display text-ink-900 text-xl">
										{t("Sign in with mobile OTP")}
									</h2>
									<p className="mt-1 text-ink-500 text-sm">
										{t(
											"We’ll send a one-time password to verify your mobile number."
										)}
									</p>
								</div>
								<form className="space-y-4" onSubmit={sendOtp}>
									<Field label={t("Mobile number")}>
										{(id) => (
											<Input
												autoComplete="tel"
												id={id}
												inputMode="numeric"
												maxLength={10}
												name="mobile"
												pattern="[0-9]{10}"
												placeholder={t("10-digit mobile number")}
												required
											/>
										)}
									</Field>
									<Button
										className="w-full"
										disabled={submitting || sessionPending}
										type="submit"
									>
										{submitting ? t("Sending OTP…") : t("Send OTP")}
									</Button>
								</form>

								{otpSentFor ? (
									<form
										className="border-ink-100 border-t pt-4"
										onSubmit={verifyOtp}
									>
										<Field
											description={`Sent to ${otpSentFor}`}
											label={t("One-time password")}
										>
											{(id) => (
												<Input
													autoComplete="one-time-code"
													id={id}
													inputMode="numeric"
													maxLength={6}
													name="otp"
													pattern="[0-9]{4,6}"
													required
												/>
											)}
										</Field>
										<Button
											className="mt-4 w-full"
											disabled={submitting}
											type="submit"
										>
											{submitting ? t("Verifying…") : t("Verify and sign in")}
										</Button>
									</form>
								) : null}
							</div>
						)}
					</>
				)}

				{error ? (
					<p className="mt-4 text-danger-500 text-sm" role="alert">
						{error}
					</p>
				) : null}
				{notice ? (
					<p aria-live="polite" className="mt-4 text-sm text-success-700">
						{notice}
					</p>
				) : null}
				{developmentOtp ? (
					<div
						aria-live="assertive"
						className="fixed right-4 bottom-4 z-50 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white shadow-card"
						role="status"
					>
						{t("Development OTP:")} <strong>{developmentOtp}</strong>
					</div>
				) : null}
			</div>
		</PageShell>
	);
}
