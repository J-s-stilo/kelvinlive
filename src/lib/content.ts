import {
  BarChart3,
  BookOpen,
  Camera,
  CreditCard,
  FileText,
  Layers3,
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
    text: "Shift your visual identity mid-stream without a render farm or a second window.",
  },
  {
    icon: Radio,
    title: "One-click studio",
    text: "Camera, mic, scene, and stream controls stay in one calm, focused workspace.",
  },
  {
    icon: Layers3,
    title: "OBS when ready",
    text: "Take a private Browser Source into the tools you already know and trust.",
  },
];

export const faqItems = [
  [
    "Do I need a download?",
    "No. LumaLive runs in your browser. Allow camera and microphone access, choose your output, and you are ready to rehearse or go live.",
  ],
  [
    "Can I stream without using AI?",
    "Absolutely. Natural camera streaming is the default and does not spend credits. AI looks are always an intentional switch.",
  ],
  [
    "Is my stream public immediately?",
    "You control the moment. Preview is private, and the audience panel explains exactly what becomes discoverable when you go live.",
  ],
  [
    "Can I use OBS?",
    "Yes. AI & OBS gives you a private Browser Source URL for OBS, Zoom, Meet, and other production tools.",
  ],
];

export const creatorStats = [
  {
    value: "1280×720",
    label: "crisp output",
  },
  {
    value: "<1s",
    label: "preview latency",
  },
  {
    value: "24/7",
    label: "cloud studio",
  },
];

export const activity = [
  {
    title: "Studio rehearsal",
    time: "Today · 10:42",
    detail: "Camera setup · 18 min",
    color: "cyan",
  },
  {
    title: "A quiet morning",
    time: "Yesterday · 08:15",
    detail: "Natural look · 42 viewers",
    color: "violet",
  },
  {
    title: "OBS test scene",
    time: "Mon · 19:05",
    detail: "Browser Source · 12 min",
    color: "amber",
  },
];

export const transactions = [
  {
    date: "16 Sep 2026",
    item: "Creator plan",
    amount: "− 12 credits",
    status: "Completed",
  },
  {
    date: "12 Sep 2026",
    item: "Credit top-up",
    amount: "+ 40 credits",
    status: "Completed",
  },
  {
    date: "02 Sep 2026",
    item: "AI look · Aurora",
    amount: "− 4 credits",
    status: "Completed",
  },
];

export const analyticsBars = [
  28,
  42,
  35,
  58,
  48,
  72,
  66,
  84,
  62,
  76,
  91,
  73,
];
