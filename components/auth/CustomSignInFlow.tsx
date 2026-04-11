"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";

import { cn } from "@/lib/utils";

type ClerkFieldError = { message?: string };

type ClerkErrorPayload = {
  global?: ClerkFieldError[];
  fields?: Record<string, ClerkFieldError | ClerkFieldError[] | undefined>;
};

type PendingSessionTask = {
  key?: string;
  type?: string;
  path?: string;
  url?: string;
  redirectUrl?: string;
};

type SessionWithTask = {
  currentTask?: PendingSessionTask | null;
} | null;

type MfaCodeStrategy = "email_code" | "phone_code";

function getTaskNavigationTarget(session: SessionWithTask): string | null {
  const task = session?.currentTask;
  if (!task) {
    return null;
  }

  return task.redirectUrl ?? task.url ?? task.path ?? null;
}

function getSupportedCodeStrategy(
  supportedFactors: Array<{ strategy?: string }>,
): MfaCodeStrategy | null {
  const available = supportedFactors.find(
    (factor) =>
      factor.strategy === "email_code" || factor.strategy === "phone_code",
  )?.strategy;

  return available === "phone_code" || available === "email_code"
    ? available
    : null;
}

function getFieldError(
  errors: ClerkErrorPayload | undefined,
  fieldName: string,
) {
  const fieldError = errors?.fields?.[fieldName];

  if (!fieldError) {
    return "";
  }

  if (Array.isArray(fieldError)) {
    return fieldError
      .map((errorItem) => errorItem.message)
      .filter(Boolean)
      .join(" ");
  }

  return fieldError.message ?? "";
}

type OAuthProvider = "google" | "github";

const OAUTH_STRATEGY_BY_PROVIDER: Record<
  OAuthProvider,
  "oauth_google" | "oauth_github"
> = {
  google: "oauth_google",
  github: "oauth_github",
};

function getOAuthProviderFromParam(value: string | null): OAuthProvider | null {
  if (value === "google" || value === "github") {
    return value;
  }

  return null;
}

export default function CustomSignInFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, errors, fetchStatus } = useSignIn();
  const oauthAutoStartedRef = useRef(false);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [oauthLoadingProvider, setOauthLoadingProvider] =
    useState<OAuthProvider | null>(null);
  const [activeMfaStrategy, setActiveMfaStrategy] =
    useState<MfaCodeStrategy | null>(null);

  const isLoading = fetchStatus === "fetching";
  const isAnyAuthFlowLoading = isLoading || oauthLoadingProvider !== null;
  const typedErrors = errors as unknown as ClerkErrorPayload | undefined;
  const globalMessages = useMemo(
    () =>
      (typedErrors?.global ?? [])
        .map((errorItem) => errorItem.message)
        .filter(Boolean),
    [typedErrors],
  );

  const needsClientTrust = signIn?.status === "needs_client_trust";
  const needsSecondFactor = signIn?.status === "needs_second_factor";
  const needsMfaVerification = needsClientTrust || needsSecondFactor;
  const preselectedOAuthProvider = useMemo(
    () => getOAuthProviderFromParam(searchParams.get("provider")),
    [searchParams],
  );

  const resolveMfaStrategy = () =>
    getSupportedCodeStrategy(
      (signIn?.supportedSecondFactors ?? []) as Array<{
        strategy?: string;
      }>,
    );

  const sendSecondFactorCode = async (strategy: MfaCodeStrategy) => {
    if (!signIn) {
      return;
    }

    if (strategy === "phone_code") {
      await signIn.mfa.sendPhoneCode();
      return;
    }

    await signIn.mfa.sendEmailCode();
  };

  const startOAuthSignIn = async (provider: OAuthProvider) => {
    if (!signIn) {
      return;
    }

    setStatusMessage("");
    setOauthLoadingProvider(provider);

    try {
      const { error } = await signIn.sso({
        strategy: OAUTH_STRATEGY_BY_PROVIDER[provider],
        redirectUrl: "/",
        redirectCallbackUrl: "/sign-in/sso-callback",
      });

      if (!error) {
        return;
      }

      console.error("Failed to start OAuth sign-in", error);
      setStatusMessage(
        `Unable to start ${provider === "google" ? "Google" : "GitHub"} sign-in. Please retry.`,
      );
      setOauthLoadingProvider(null);
    } catch (error) {
      console.error("Failed to start OAuth sign-in", error);
      setStatusMessage(
        `Unable to start ${provider === "google" ? "Google" : "GitHub"} sign-in. Please retry.`,
      );
      setOauthLoadingProvider(null);
    }
  };

  useEffect(() => {
    if (!signIn || !preselectedOAuthProvider || oauthAutoStartedRef.current) {
      return;
    }

    oauthAutoStartedRef.current = true;
    void signIn
      .sso({
        strategy: OAUTH_STRATEGY_BY_PROVIDER[preselectedOAuthProvider],
        redirectUrl: "/",
        redirectCallbackUrl: "/sign-in/sso-callback",
      })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to auto-start OAuth sign-in", error);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to auto-start OAuth sign-in", error);
      });
  }, [preselectedOAuthProvider, signIn]);

  const finishSignIn = async () => {
    if (!signIn) {
      return;
    }

    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        const target =
          getTaskNavigationTarget(session as SessionWithTask) ?? "/";
        const url = decorateUrl(target);
        if (url.startsWith("http")) {
          window.location.href = url;
          return;
        }

        router.push(url);
      },
    });
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");

    if (!signIn) {
      return;
    }

    const { error } = await signIn.password({
      emailAddress,
      password,
    });

    if (error) {
      return;
    }

    if (signIn.status === "complete") {
      await finishSignIn();
      return;
    }

    if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      const strategy = resolveMfaStrategy();

      if (!strategy) {
        setStatusMessage(
          "A supported second factor is required to continue sign-in.",
        );
        return;
      }

      setActiveMfaStrategy(strategy);

      try {
        await sendSecondFactorCode(strategy);
        setStatusMessage(
          strategy === "phone_code"
            ? "Verification code sent. Check your phone to continue."
            : "Verification code sent. Check your inbox to continue.",
        );
      } catch {
        setStatusMessage(
          "Unable to send a verification code right now. Please retry.",
        );
      }
      return;
    }

    setStatusMessage("Sign-in attempt is not complete yet.");
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("");

    if (!signIn) {
      return;
    }

    const strategy = activeMfaStrategy ?? resolveMfaStrategy();
    if (!strategy) {
      setStatusMessage("No supported second factor is available.");
      return;
    }

    setActiveMfaStrategy(strategy);

    try {
      const result =
        strategy === "phone_code"
          ? await signIn.mfa.verifyPhoneCode({ code })
          : await signIn.mfa.verifyEmailCode({ code });

      if (result.error) {
        return;
      }
    } catch {
      setStatusMessage("Verification failed. Please try again.");
      return;
    }

    if (signIn.status === "complete") {
      await finishSignIn();
      return;
    }

    setStatusMessage("Verification failed. Please check the code and retry.");
  };

  const emailError = getFieldError(typedErrors, "identifier");
  const passwordError = getFieldError(typedErrors, "password");
  const codeError = getFieldError(typedErrors, "code");

  if (!signIn) {
    return <div className="text-zinc-400 text-sm">Loading sign-in...</div>;
  }

  return (
    <div className="space-y-5">
      {needsMfaVerification ? (
        <form className="space-y-4" onSubmit={handleVerifyCode}>
          <div className="space-y-2">
            <label
              htmlFor="verification-code"
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-400"
            >
              Verification code
            </label>
            <input
              id="verification-code"
              name="code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              required
              className="h-11 w-full border border-white/15 bg-black px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/35"
              placeholder="Enter the 6-digit code"
            />
            {codeError ? (
              <p className="text-xs text-red-300">{codeError}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isAnyAuthFlowLoading}
            className={cn(
              "h-11 w-full border border-white bg-white text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition-colors",
              "hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {isAnyAuthFlowLoading ? "Verifying..." : "Verify and continue"}
          </button>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <button
              type="button"
              onClick={async () => {
                const strategy = activeMfaStrategy ?? resolveMfaStrategy();

                if (!strategy) {
                  setStatusMessage("No supported second factor is available.");
                  return;
                }

                try {
                  await sendSecondFactorCode(strategy);
                  setStatusMessage(
                    strategy === "phone_code"
                      ? "Verification code sent. Check your phone to continue."
                      : "Verification code sent. Check your inbox to continue.",
                  );
                } catch {
                  setStatusMessage(
                    "Unable to resend verification code right now. Please retry.",
                  );
                }
              }}
              disabled={isAnyAuthFlowLoading}
              className="border border-white/12 px-3 py-2 uppercase tracking-[0.14em] transition-colors hover:border-white/30 hover:text-white"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await signIn.reset();
                } catch {
                  // Keep local state reset even if the remote reset call fails.
                }
                setCode("");
                setStatusMessage("");
                setActiveMfaStrategy(null);
              }}
              disabled={isAnyAuthFlowLoading}
              className="border border-white/12 px-3 py-2 uppercase tracking-[0.14em] transition-colors hover:border-white/30 hover:text-white"
            >
              Start over
            </button>
          </div>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleSignIn}>
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              Continue with provider
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  void startOAuthSignIn("google");
                }}
                disabled={isAnyAuthFlowLoading}
                className={cn(
                  "h-11 border border-white/15 bg-black px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-100 transition-colors",
                  "hover:border-white/35 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {oauthLoadingProvider === "google" ? "Connecting..." : "Google"}
              </button>

              <button
                type="button"
                onClick={() => {
                  void startOAuthSignIn("github");
                }}
                disabled={isAnyAuthFlowLoading}
                className={cn(
                  "h-11 border border-white/15 bg-black px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-100 transition-colors",
                  "hover:border-white/35 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {oauthLoadingProvider === "github" ? "Connecting..." : "GitHub"}
              </button>
            </div>

            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <span className="h-px flex-1 bg-white/15" />
              <span>Or continue with email</span>
              <span className="h-px flex-1 bg-white/15" />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="signin-email"
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-400"
            >
              Email address
            </label>
            <input
              id="signin-email"
              name="email"
              type="email"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              autoComplete="email"
              required
              className="h-11 w-full border border-white/15 bg-black px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/35"
              placeholder="you@company.com"
            />
            {emailError ? (
              <p className="text-xs text-red-300">{emailError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="signin-password"
                className="text-[10px] uppercase tracking-[0.2em] text-zinc-400"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-200"
              >
                Forgot
              </Link>
            </div>
            <input
              id="signin-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="h-11 w-full border border-white/15 bg-black px-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/35"
              placeholder="Enter your password"
            />
            {passwordError ? (
              <p className="text-xs text-red-300">{passwordError}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isAnyAuthFlowLoading}
            className={cn(
              "h-11 w-full border border-white bg-white text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition-colors",
              "hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {isAnyAuthFlowLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      )}

      {statusMessage ? (
        <p className="border border-white/12 bg-black/50 px-3 py-2 text-xs text-zinc-300">
          {statusMessage}
        </p>
      ) : null}

      {globalMessages.length > 0 ? (
        <ul className="space-y-1 border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {globalMessages.map((message, index) => (
            <li key={`globalMessage-${index}`}>{message}</li>
          ))}
        </ul>
      ) : null}

      <p className="text-[11px] text-zinc-500">
        No account yet?{" "}
        <Link
          href="/sign-up"
          className="uppercase tracking-[0.14em] text-zinc-100 underline-offset-4 hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
