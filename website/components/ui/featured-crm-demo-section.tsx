"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { useState } from "react";
import {
  PlayCircle,
  BarChart3,
  Bot,
  FileSpreadsheet,
  Users2,
  Building2,
  Globe,
  Briefcase,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function FeaturedCrmDemoSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const crmFeatures = [
    {
      title: "Sales Pipeline Tracking",
      icon: BarChart3,
      subtitle:
        "Easily monitor every lead from first contact to final closure with a simple, visual pipeline that keeps your entire sales process clear and on track."
    },
    {
      title: "Automated Follow-ups",
      icon: Bot,
      subtitle:
        "Use AI-powered reminders to send timely, personalized messages, helping you maintain momentum with leads and ensure no opportunity is ever lost."
    },
    {
      title: "Custom Reports",
      icon: FileSpreadsheet,
      subtitle:
        "Quickly generate tailored, data-rich reports to measure results, uncover new opportunities, and guide your business decisions with precision and clarity."
    },
    {
      title: "Team Collaboration",
      icon: Users2,
      subtitle:
        "Share updates instantly, assign tasks efficiently, and align your entire team’s efforts so you can close deals faster and deliver consistent results."
    }
  ];

  const integrations = [
    { name: "Salesforce", subtitle: "Enterprise CRM platform", icon: Building2, color: "text-blue-500" },
    { name: "HubSpot CRM", subtitle: "Inbound marketing & sales", icon: Globe, color: "text-orange-500" },
    { name: "Zoho CRM", subtitle: "Affordable CRM solution", icon: Briefcase, color: "text-emerald-500" },
    { name: "Pipedrive", subtitle: "Sales pipeline management", icon: Layers, color: "text-amber-500" },
    { name: "Freshsales", subtitle: "Freshworks sales CRM", icon: Sparkles, color: "text-cyan-500" },
    { name: "Dynamics 365", subtitle: "Microsoft business suite", icon: ShieldCheck, color: "text-indigo-500" },
    { name: "Copper CRM", subtitle: "Google Workspace CRM", icon: Zap, color: "text-rose-500" },
    { name: "Insightly", subtitle: "Project & CRM management", icon: BarChart3, color: "text-violet-500" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-white text-black dark:bg-zinc-900 dark:text-white">
      {/* Header */}
      <header className="text-left py-10">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
          Platform Architecture & Capabilities
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Empowering teams <br />with intelligent delivery workflows.
        </h1>
      </header>

      {/* Templates Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
        {/* Main video/image card */}
        <Card className="lg:col-span-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 p-2 overflow-hidden relative mb-4 lg:mb-0 flex flex-col min-h-[420px] rounded-2xl">
          <CardContent className="p-0 relative flex-grow group overflow-hidden rounded-xl">
            {isPlaying ? (
              <video
                src="https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/crm(1)(1)(1).mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <>
                <div className="relative w-full h-full min-h-[380px]">
                  <Image
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80"
                    alt="Platform Analytics & Operations"
                    className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-102"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-xl" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-xs font-medium uppercase tracking-wider text-rose-300">Live Telemetry Preview</span>
                    <h3 className="text-lg font-bold">Intelligent Dispatch & Zone Analytics</h3>
                    <p className="text-xs text-white/80">Real-time Karachi order dispatching and courier float supervision</p>
                  </div>
                </div>

                {/* Play button overlay */}
                <button
                  onClick={() => setIsPlaying(true)}
                  aria-label="Play CRM walkthrough"
                  className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-10 h-10 text-rose-600" />
                  </div>
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 h-full">
          {crmFeatures.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="flex flex-col border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3.5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-all"
              >
                {/* Header Icon + Card thumbnail */}
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">0{i + 1}</span>
                </div>

                {/* Title + Subtitle */}
                <div className="mt-1 flex-1 flex flex-col justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {feature.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Integration / Ecosystem Row */}
      <section className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-left mb-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Connected Ecosystem Integrations
          </h2>
          <p className="text-xs text-zinc-500">Supported enterprise services and data pipelines</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.name}
                className="p-3 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl transition"
              >
                <div className={`w-9 h-9 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 ${integration.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 text-xs truncate">
                    {integration.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {integration.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-10 mt-6 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Powered by SpeedyMeals High-Frequency Event Architecture
        </span>
      </footer>
    </div>
  );
}
