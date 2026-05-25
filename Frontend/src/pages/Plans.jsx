import { pricingData } from "../data/pricingData";
import SectionTitle from "../components/SectionTitle";
import { useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const loadRazorpayCheckout = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Plans = () => {
  const { user, isLoggedIn, refreshUser, openAuthModal } = useAuth();
  const [buyingPlanId, setBuyingPlanId] = useState(null);
  const [message, setMessage] = useState("");

  const handleBuyPlan = async (plan) => {
    setMessage("");

    if (!isLoggedIn) {
      openAuthModal("signup");
      return;
    }

    setBuyingPlanId(plan.id);

    try {
      const checkoutLoaded = await loadRazorpayCheckout();
      if (!checkoutLoaded) {
        throw new Error("Could not load Razorpay Checkout.");
      }

      const orderResponse = await api.post("/plans/buy", {
        plan_id: plan.id,
      });

      const order = orderResponse.data;

      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "AdVid",
        description: `${order.plan.name} plan - ${order.plan.credits} credits`,
        order_id: order.order_id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.mobile || "",
        },
        notes: {
          plan_id: plan.id,
          test_mode: String(order.test_mode),
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async (response) => {
          try {
            const verifyResponse = await api.post("/plans/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await refreshUser();
            setMessage(verifyResponse.data.message);
          } catch (error) {
            const detail = error.response?.data?.detail;
            setMessage(detail || "Payment was captured, but verification failed.");
          } finally {
            setBuyingPlanId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setBuyingPlanId(null);
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setMessage(response.error?.description || "Payment failed.");
        setBuyingPlanId(null);
      });

      checkout.open();
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessage(detail || error.message || "Could not start payment.");
    } finally {
      setBuyingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] px-6 md:px-16 py-20">

      {/* HEADER */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <SectionTitle
          text2="Pricing Plans"
          text3="Flexible pricing options designed to meet your needs —
          whether you're just getting started or scaling up."
        />
      </div>

      {/* CARDS */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">

        {pricingData.map((plan, index) => {

          const isPopular = plan.mostPopular;

          return (
            <div
              key={index}
              className={`relative rounded-2xl p-6 transition
              ${
                isPopular
                  ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl scale-105"
                  : "bg-white text-gray-800 border shadow-sm hover:shadow-md"
              }`}
            >

              {/* MOST POPULAR BADGE */}
              {isPopular && (
                <span className="absolute top-4 right-4 bg-white text-indigo-600 text-xs px-3 py-1 rounded-full font-medium">
                  Most Popular
                </span>
              )}

              {/* TITLE */}
              <h3 className={`text-lg font-semibold mb-2`}>
                {plan.title}
              </h3>

              {/* PRICE */}
              <h2 className="text-3xl font-bold">
                ₹{plan.price}
                <span className={`text-sm ml-1 ${isPopular ? "text-white/80" : "text-gray-500"}`}>
                  /mo
                </span>
              </h2>

              {/* LINE */}
              <div className={`my-5 h-[1px] ${isPopular ? "bg-white/30" : "bg-gray-200"}`} />

              {/* FEATURES */}
              <ul className="space-y-3 text-sm">
                {plan.features.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <Icon size={16} className={isPopular ? "text-white" : "text-indigo-600"} />
                      {feature.name}
                    </li>
                  );
                })}
              </ul>

              {/* BUTTON */}
              <button
                onClick={() => handleBuyPlan(plan)}
                disabled={buyingPlanId === plan.id}
                className={`mt-8 w-full py-2 rounded-lg font-medium transition
                ${
                  isPopular
                    ? "bg-white text-indigo-600 hover:bg-gray-100"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {buyingPlanId === plan.id ? "Starting..." : plan.buttonText}
              </button>

            </div>
          );
        })}

      </div>
      {message && (
        <div className="max-w-xl mx-auto mt-8 text-center text-sm text-gray-700 bg-white border rounded-lg px-4 py-3">
          {message}
        </div>
      )}
      <div className="text-center mt-16 text-sm text-gray-500">
        Create stunning images for just{" "}
        <span className="text-indigo-600 font-medium">5 credits</span> and generate
        immersive videos for{" "}
        <span className="text-indigo-600 font-medium">10 credits</span>.
      </div>

    </div>
  );
};

export default Plans;
