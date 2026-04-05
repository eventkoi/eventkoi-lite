// components/order/PaymentMethod.jsx
import { getCountryName } from "@/lib/utils";
import { __ } from "@wordpress/i18n";
import { SquareArrowOutUpRight } from "lucide-react";

function LinkBrandLogo() {
  return (
    <svg
      width="72"
      height="24"
      viewBox="0 0 72 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Link"
      title="Link"
      className="h-3.5 w-auto"
    >
      <path
        d="M36.12 3.67683c0-1.12801.9504-2.04481 2.0688-2.04481 1.1184 0 2.0688.9216 2.0688 2.04481 0 1.1232-.9168 2.0688-2.0688 2.0688-1.152 0-2.0688-.9168-2.0688-2.0688ZM29.9808 1.92001h3.6V22.08h-3.6V1.92001ZM40.008 7.68001h-3.6288V22.08h3.6288V7.68001ZM66.096 14.3904c2.7312-1.68 4.5888-4.1808 5.3232-6.71516h-3.6288c-.9456 2.41916-3.1152 4.23836-5.5008 5.01116V1.91523h-3.6288V22.0752h3.6288V16.08c2.7696.6912 4.9584 3.0864 5.7072 5.9952h3.6528c-.5568-3.0528-2.6448-5.9088-5.5536-7.6848ZM46.44 9.29283c.9504-1.2624 2.8032-1.99681 4.3056-1.99681 2.8032 0 5.1216 2.04961 5.1264 5.14558v9.6336h-3.6288v-8.832c0-1.272-.5664-2.7408-2.4048-2.7408-2.16 0-3.4032 1.9152-3.4032 4.1568v7.4256h-3.6288V7.68962H46.44v1.60321Z"
        fill="#171717"
      />
      <circle cx="12" cy="12" r="12" fill="#00D66F" />
      <path
        d="M11.4479 4.80005H7.74707c.72 3.0096 2.82243 5.58235 5.45283 7.19995-2.6352 1.6176-4.73283 4.1904-5.45283 7.2h3.70083c.9168-2.784 3.456-5.2032 6.576-5.6976v-3.0095c-3.1248-.4896-5.664-2.90885-6.576-5.69285Z"
        fill="#171717"
      />
    </svg>
  );
}

function VisaBrandLogo() {
  return (
    <svg
      width="38"
      height="12"
      viewBox="0 0 38 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Visa"
      title="Visa"
      className="h-3 w-auto"
    >
      <path
        d="M14.4252 11.6226H11.886L13.4744 0.372559H16.0136L14.4252 11.6226Z"
        fill="#1434CB"
      />
      <path
        d="M23.6212 0.647595C23.1204 0.443274 22.332 0.222656 21.3528 0.222656C18.8556 0.222656 17.0976 1.48212 17.0872 3.28553C17.0664 4.61695 18.324 5.35861 19.2604 5.79008C20.228 6.23209 20.5492 6.51598 20.544 6.90188C20.5388 7.49255 19.806 7.7632 19.1208 7.7632C18.1675 7.7632 17.6628 7.63173 16.8796 7.30189L16.5636 7.16004L16.2324 9.50996C16.7892 9.76073 17.8212 9.98016 18.8904 9.99097C21.5484 9.99097 23.2808 8.74717 23.3016 6.81948C23.312 5.76595 22.6368 4.96344 21.1708 4.31449C20.2804 3.88842 19.7352 3.6034 19.7404 3.17193C19.7404 2.79088 20.1928 2.39417 21.1708 2.39417C21.9756 2.37856 22.5588 2.55858 22.9944 2.74184L23.206 2.83728L23.6212 0.647595Z"
        fill="#1434CB"
      />
      <path
        d="M27.3271 7.63752C27.5398 7.09038 28.3551 4.99752 28.3551 4.99752C28.3447 5.01835 28.5678 4.44017 28.6963 4.08213L28.8779 4.94303C28.8779 4.94303 29.3815 7.20346 29.4859 7.63752H27.3271ZM30.4595 0.372559H28.4967C27.8899 0.372559 27.4347 0.542164 27.1691 1.16038L23.3999 9.62153H26.0579C26.0579 9.62153 26.4935 8.48116 26.5927 8.23227C26.8839 8.23227 29.4743 8.23227 29.8447 8.23227C29.9175 8.55671 30.1367 9.62153 30.1367 9.62153H32.4927L30.4595 0.372559Z"
        fill="#1434CB"
      />
      <path
        d="M9.79052 0.372559L7.30372 8.04509L7.03932 6.78045C6.57636 5.25243 5.12492 3.59696 3.50372 2.77884L5.77932 9.6112H8.45812L12.4448 0.372559H9.79052Z"
        fill="#1434CB"
      />
      <path
        d="M5.00526 0.372559H0.930862L0.888062 0.578001C4.05886 1.35642 6.15726 3.23181 7.03926 6.78024L6.13846 1.17608C5.98886 0.568161 5.53886 0.39337 5.00526 0.372559Z"
        fill="#F7A600"
      />
    </svg>
  );
}

export function PaymentMethod({ order }) {
  const paymentTypeRaw = String(order?.payment_method_type || "").toLowerCase();
  const paymentBrandRaw = String(order?.payment_brand || "").toLowerCase();
  const isLinkPayment = paymentTypeRaw === "link";
  const isVisaCard = paymentTypeRaw === "card" && paymentBrandRaw === "visa";
  const originCountryCode =
    order?.payment_country ||
    order?.customer_address?.country ||
    order?.billing_address?.country ||
    order?.billing_country ||
    "";
  const getPaymentDisplay = () => {
    const type = order.payment_method_type;
    const brand = order.payment_brand;
    const last4 = order.payment_last4;

    if (!type) return "";

    if (type === "card" && brand && last4) {
      return `${brand.charAt(0).toUpperCase() + brand.slice(1)} ${__(
        "ending in",
        "eventkoi"
      )} ${last4}`;
    }

    if (brand && last4) {
      return `${type} (${brand.toUpperCase()} ••••${last4})`;
    }

    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="rounded-xl border bg-white p-6">
      <h3 className="text-base font-medium mb-4">
        {__("Payment method", "eventkoi")}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Payment ID", "eventkoi")}
          </span>
          {order.stripe_payment_intent_id && (
            <a
              href={`https://dashboard.stripe.com/${
                order.is_test ? "test/" : ""
              }payments/${order.stripe_payment_intent_id}`}
              className="inline-flex items-center gap-1 underline text-foreground max-w-full overflow-hidden whitespace-nowrap truncate"
              title={order.stripe_payment_intent_id}
              target="_blank"
              rel="noreferrer"
            >
              <span className="truncate">{order.stripe_payment_intent_id}</span>
              <SquareArrowOutUpRight className="w-4 h-4 flex-shrink-0" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Type", "eventkoi")}
          </span>
          <span className="inline-flex items-center gap-1 text-foreground">
            {isLinkPayment ? (
              <LinkBrandLogo />
            ) : (
              <>
                {isVisaCard ? <VisaBrandLogo /> : null}
                <span>{getPaymentDisplay()}</span>
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("Origin", "eventkoi")}
          </span>
          <span className="text-foreground">
            {originCountryCode ? getCountryName(originCountryCode) : ""}
          </span>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <span className="text-muted-foreground w-32">
            {__("IP address", "eventkoi")}
          </span>
          <span className="text-foreground">{order?.ip_address || ""}</span>
        </div>
      </div>
    </div>
  );
}
