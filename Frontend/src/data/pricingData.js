import { CheckIcon } from "lucide-react";

export const pricingData = [
  {
    id: "starter",
    title: "Starter",
    price: 29,
    yearlyPrice: 24,
    features: [
      {
        name: "100 AI Chat Credits",
        icon: CheckIcon,
      },
      {
        name: "Up to 100 documents",
        icon: CheckIcon,
      },
      {
        name: "Standard semantic search",
        icon: CheckIcon,
      },
      {
        name: "Email support",
        icon: CheckIcon,
      },
    ],
    buttonText: "Start Free Trial",
  },
  {
    id: "professional",
    title: "Professional",
    price: 49,
    yearlyPrice: 39,
    mostPopular: true,
    features: [
      {
        name: "250 AI Chat Credits",
        icon: CheckIcon,
      },
      {
        name: "Unlimited documents",
        icon: CheckIcon,
      },
      {
        name: "Advanced RAG & Citations",
        icon: CheckIcon,
      },
      {
        name: "Team collaboration",
        icon: CheckIcon,
      },
      {
        name: "Priority support",
        icon: CheckIcon,
      },
    ],
    buttonText: "Get Professional",
  },
  {
    id: "enterprise",
    title: "Enterprise",
    price: 79,
    yearlyPrice: 65,
    features: [
      {
        name: "500 AI Chat Credits",
        icon: CheckIcon,
      },
      {
        name: "Unlimited documents",
        icon: CheckIcon,
      },
      {
        name: "Private deployment",
        icon: CheckIcon,
      },
      {
        name: "API & SSO Access",
        icon: CheckIcon,
      },
      {
        name: "Dedicated support team",
        icon: CheckIcon,
      },
    ],
    buttonText: "Contact Sales",
  },
];
