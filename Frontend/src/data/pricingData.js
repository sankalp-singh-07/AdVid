import { CheckIcon } from "lucide-react";

export const pricingData = [
  {
    id: "basic",
    title: "Basic Plan",
    price: 5,
    features: [
      {
        name: "20 credits",
        icon: CheckIcon,
      },
      {
        name: "Standard video quality",
        icon: CheckIcon,
      },
      {
        name: "No watermark",
        icon: CheckIcon,
      },
      {
        name: "Slower generation speed",
        icon: CheckIcon,
      },
      {
        name: "Email support",
        icon: CheckIcon,
      },
    ],
    buttonText: "Get Started",
  },
  {
    id: "pro",
    title: "Pro Plan",
    price: 25,
    mostPopular: true,
    features: [
      {
        name: "50 credits",
        icon: CheckIcon,
      },
      {
        name: "HD video export",
        icon: CheckIcon,
      },
      {
        name: "No watermark",
        icon: CheckIcon,
      },
      {
        name: "Faster generation",
        icon: CheckIcon,
      },
      {
        name: "Priority support",
        icon: CheckIcon,
      },
    ],
    buttonText: "Best Value",
  },
  {
    id: "enterprise",
    title: "Enterprise Plan",
    price: 50,
    features: [
      {
        name: "500 credits",
        icon: CheckIcon,
      },
      {
        name: "FHD video export",
        icon: CheckIcon,
      },
      {
        name: "No watermark",
        icon: CheckIcon,
      },
      {
        name: "Faster generation",
        icon: CheckIcon,
      },
      {
        name: "Chat + Email support",
        icon: CheckIcon,
      },
    ],
    buttonText: "Get Started",
  },
];
