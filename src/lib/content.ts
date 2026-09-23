import {
  BarChart3,
  BookOpen,
  Camera,
  CreditCard,
  FileText,
  Layers3,
  MessageCircle,
  Radio,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

export const navItems = [
  {
    href: "/studio",
    label: "Studio",
    icon: Camera,
  },
  {
    href: "/feed",
    label: "Feed",
    icon: Users,
  },
  {
    href: "/feedback",
    label: "Feedback",
    icon: MessageCircle,
  },
  {
    href: "/ai-obs",
    label: "AI & OBS",
    icon: Sparkles,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/credits",
    label: "Credits",
    icon: CreditCard,
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: FileText,
  },
  {
    href: "/tutorial",
    label: "Tutorial",
    icon: BookOpen,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export const featureCards = [
  {
    icon: Sparkles,
    title: "AI looks, on cue",
    text: "AI transformation will be connected when the transformation service is ready.",
  },
  {
    icon: Radio,
    title: "One-click studio",
    text: "Camera, microphone, scene, and stream controls stay together in one workspace.",
  },
  {
    icon: Layers3,
    title: "OBS when ready",
    text: "Prepare a Browser Source for your production workflow.",
  },
];

export const faqItems = [
  [
    "Do I need a download?",
    "No. KelvinLive is designed to run in your browser.",
  ],
  [
    "Can I stream without AI?",
    "Yes. Natural camera streaming works without AI transformation.",
  ],
  [
    "Is my stream public immediately?",
    "No. You control when a session becomes live.",
  ],
  [
    "Can I use OBS?",
    "Yes. The studio can provide a Browser Source for your production setup.",
  ],
];

export const creatorStats = [
  {
    value: "Live",
    label: "studio",
  },
  {
    value: "AI",
    label: "transformation",
  },
  {
    value: "OBS",
    label: "production",
  },
];

export const activity: Array<{
  title: string;
  time: string;
  detail: string;
  color: string;
}> = [];

export const transactions: Array<{
  date: string;
  item: string;
  amount: string;
  status: string;
}> = [];

export const analyticsBars: number[] = [];
