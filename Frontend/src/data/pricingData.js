import { CheckIcon } from "lucide-react";

export const pricingData = [
  {
    id: "starter",
    title: "Starter",
    price: 49,
    yearlyPrice: 39,
    features: [
      {
        name: "Up to 100 documents",
        icon: CheckIcon,
      },
      {
        name: "Basic AI Chat",
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
    price: 149,
    yearlyPrice: 119,
    mostPopular: true,
    features: [
      {
        name: "Unlimited documents",
        icon: CheckIcon,
      },
      {
        name: "Advanced RAG & Citations",
        icon: CheckIcon,
      },
      {
        name: "AI document generation",
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
    price: 499,
    yearlyPrice: 399,
    features: [
      {
        name: "Unlimited everything",
        icon: CheckIcon,
      },
      {
        name: "Private deployment",
        icon: CheckIcon,
      },
      {
        name: "Local Ollama integration",
        icon: CheckIcon,
      },
      {
        name: "API & SSO Access",
        icon: CheckIcon,
      },
      {
        name: "Custom vector database",
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
