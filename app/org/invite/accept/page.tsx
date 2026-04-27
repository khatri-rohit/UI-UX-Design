"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

function InviteAcceptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<
    "idle" | "accepting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  // If not signed in, redirect to sign-up with the token preserved
  useEffect(() => {
    if (isSignedIn === false && token) {
      router.push(`/sign-up?invite_token=${token}`);
    }
  }, [isSignedIn, router, token]);

  const handleAccept = async () => {
    setStatus("accepting");
    try {
      const res = await fetch("/api/org/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { error: boolean; message: string };
      if (res.ok && !data.error) {
        setStatus("success");
        setMessage(data.message);
        setTimeout(() => router.push("/"), 2500);
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to accept invitation.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (!token) return <p>Invalid invitation link.</p>;
  if (!isSignedIn) return <p>Redirecting to sign in...</p>;

  return (
    <div>
      {status === "success" && <p>{message} Redirecting to dashboard...</p>}
      {status === "error" && <p>{message}</p>}
      {status === "idle" && (
        <div>
          <h1>Team Invitation</h1>
          <p>You have been invited to join a LOGIC Pro organisation.</p>
          <button onClick={handleAccept}>Accept and get Pro access</button>
        </div>
      )}
      {status === "accepting" && <p>Accepting...</p>}
    </div>
  );
}

export default function InviteAcceptPageWrapper() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <InviteAcceptPage />
    </Suspense>
  );
}
