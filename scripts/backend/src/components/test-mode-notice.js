import { Alert, AlertDescription } from "@/components/ui/alert";
import { useStripeAccount } from "@/hooks/useStripeAccount";
import { __ } from "@wordpress/i18n";

export function TestModeNotice() {
  const { data: account, loading: accountLoading } = useStripeAccount();

  if (accountLoading || !account?.is_test) {
    return null;
  }

  return (
    <Alert className="bg-amber-50 border-amber-200 text-sm py-2 px-4">
      <AlertDescription className="text-amber-900/90">
        <span className="font-medium">
          {__("You’re in test mode", "eventkoi")}
        </span>{" "}
        {__("— no real charges are made.", "eventkoi")}
      </AlertDescription>
    </Alert>
  );
}
