import { useState } from "react";

import { Box } from "@/components/box";
import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { callEdgeFunction } from "@/lib/remote";
import { showStaticToast, showToastError } from "@/lib/toast";

/**
 * ProLaunch form.
 *
 * Displays email capture UI for upcoming Pro plan with secure HMAC submission.
 *
 * @return {JSX.Element} ProLaunch UI block.
 */
export function ProLaunch() {
  const [email, setEmail] = useState(eventkoi_params.admin_email || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  /**
   * Submit email to Supabase via Edge Function.
   *
   * @return {Promise<void>}
   */
  const handleSubmit = async () => {
    if (!email || !email.includes("@")) {
      showToastError("Please enter a valid email.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await callEdgeFunction("pro-signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          plugin_version: eventkoi_params?.version || null,
        }),
      });

      if (data?.success && data?.duplicate) {
        showStaticToast("You're already signed up.");
        setSuccess(true);
      } else if (data?.success) {
        showStaticToast("You're on the list! 🎉");
        setSuccess(true);
      } else {
        showToastError("Signup failed. Please try again.");
      }
    } catch (err) {
      console.error("Signup error:", err);
      showToastError("Unexpected error. Please try again.");
    }

    setSubmitting(false);
  };

  if (!success) return null;

  return (
    <Box container>
      <Heading level={3}>Sign up for Pro launch + early bird discount</Heading>
      <p className="text-base leading-7 mb-4">
        Enter your email to get notified when we launch EventKoi Pro. Get a
        special discount only for early users like yourself.
      </p>

      <div className="flex flex-col items-start gap-1.5">
        <Label htmlFor="ek-admin-email">Your email</Label>
        <Input
          type="email"
          id="ek-admin-email"
          value={email}
          disabled={success}
          placeholder="Enter your email..."
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="mt-5">
          <Button
            onClick={handleSubmit}
            disabled={submitting || success}
            className="px-8 min-h-[50px] min-w-[175px] border rounded-xl items-center border-foreground bg-foreground text-white hover:text-card-foreground hover:bg-accent hover:border-foreground/40"
          >
            {success
              ? "You're signed up!"
              : submitting
              ? "Submitting..."
              : "Get notified"}
          </Button>
          <div className="pt-1 text-muted-foreground text-sm">
            We will only email you about launch notifications.
          </div>
        </div>
      </div>
    </Box>
  );
}
