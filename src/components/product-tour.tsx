"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

type TourStep = {
  target: string;
  title: string;
  body: string;
};

const tourSteps: Record<string, TourStep[]> = {
  "/dashboard": [
    {
      target: "page-header",
      title: "Your ops launchpad",
      body: "Dashboard stays light: quick signals, recent records, and shortcuts into the real work.",
    },
    {
      target: "dashboard-metrics",
      title: "Key counts",
      body: "Use these to spot whether programmes, beneficiaries, evidence, and review queues are moving.",
    },
    {
      target: "dashboard-recent",
      title: "Recent records",
      body: "This is the fastest way to jump back into programmes, people, and files you just touched.",
    },
    {
      target: "dashboard-actions",
      title: "Quick actions",
      body: "Start new programme setup, beneficiary review, or evidence upload from here.",
    },
  ],
  "/beneficiaries": [
    {
      target: "page-header",
      title: "Beneficiary registry",
      body: "This is the daily people-record screen: add, search, review, enrol, and follow up.",
    },
    {
      target: "beneficiary-add",
      title: "Add beneficiary",
      body: "Capture the basic identity record first. Programme-specific data is captured after enrolment.",
    },
    {
      target: "beneficiary-filters",
      title: "Filter fast",
      body: "Narrow by programme, stage, safeguarding, or status when the registry grows.",
    },
    {
      target: "beneficiary-table",
      title: "Open the detail panel",
      body: "Click a row to manage consent, safeguarding, notes, scorecards, and programme data.",
    },
  ],
  "/pipeline": [
    {
      target: "page-header",
      title: "Pipeline processing",
      body: "Move beneficiaries through a programme's stages without leaving the page.",
    },
    {
      target: "pipeline-controls",
      title: "Pick programme and search",
      body: "Choose the programme you are processing, then search by name or beneficiary code.",
    },
    {
      target: "pipeline-board",
      title: "Stage columns",
      body: "Each card sits in its current stage. Click a card to process the beneficiary.",
    },
    {
      target: "pipeline-panel",
      title: "Required checks",
      body: "Move stages, upload consent, complete required fields, and update the scorecard here.",
    },
  ],
  "/evidence": [
    {
      target: "page-header",
      title: "Evidence library",
      body: "Files live in Google Drive; ImpactOps keeps searchable metadata and verification status.",
    },
    {
      target: "page-action",
      title: "Upload evidence",
      body: "Upload a file and link it to the right programme so Drive folders stay organised.",
    },
    {
      target: "evidence-metrics",
      title: "Verification snapshot",
      body: "Pending, in-review, and confirmed counts show what still needs attention.",
    },
    {
      target: "evidence-register",
      title: "Open details",
      body: "Click a row to update verification status, add notes, or open the Drive file.",
    },
  ],
  "/settings": [
    {
      target: "page-header",
      title: "Settings",
      body: "Admins configure fields, programme types, users, and platform integrations here.",
    },
    {
      target: "settings-tabs",
      title: "Configuration tabs",
      body: "Field templates and programme types shape the data staff capture later.",
    },
    {
      target: "settings-users",
      title: "Users",
      body: "Admins can create users and assign roles. Programme officers handle operations, not admin settings.",
    },
    {
      target: "settings-platform",
      title: "Platform readiness",
      body: "Drive diagnostics help confirm uploads will route into the configured Google account.",
    },
  ],
};

const eventName = "impactops:restart-tour";

export function ProductTour({ userKey = "browser" }: { userKey?: string }) {
  const pathname = usePathname();
  const pageKey = useMemo(() => resolvePageKey(pathname), [pathname]);
  const steps = useMemo(() => (pageKey ? tourSteps[pageKey] ?? [] : []), [pageKey]);
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const startTour = useCallback(() => {
    if (!steps.length) return;
    setIndex(0);
    setActive(true);
  }, [steps.length]);

  useEffect(() => {
    function restart() {
      startTour();
    }
    window.addEventListener(eventName, restart);
    return () => window.removeEventListener(eventName, restart);
  }, [startTour]);

  useEffect(() => {
    if (!pageKey || !steps.length) return;
    const key = storageKey(pageKey, userKey);
    if (window.localStorage.getItem(key) === "done") return;
    const timer = window.setTimeout(() => startTour(), 500);
    return () => window.clearTimeout(timer);
  }, [pageKey, startTour, steps.length, userKey]);

  useEffect(() => {
    if (!active || !steps[index]) return;

    function updateRect() {
      const target = document.querySelector<HTMLElement>(`[data-tour="${steps[index].target}"]`);
      if (!target) {
        setTargetRect(null);
        return;
      }
      target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      window.setTimeout(() => setTargetRect(target.getBoundingClientRect()), 220);
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, index, steps]);

  if (!active || !steps[index]) return null;

  const step = steps[index];
  const last = index === steps.length - 1;
  const popoverStyle = getPopoverStyle(targetRect);

  function finish() {
    if (pageKey) window.localStorage.setItem(storageKey(pageKey, userKey), "done");
    setActive(false);
  }

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div className="absolute inset-0 bg-slate-950/45" />
      {targetRect ? (
        <div
          className="absolute rounded-lg border-2 border-primary bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] transition-all"
          style={{
            left: Math.max(targetRect.left - 6, 8),
            top: Math.max(targetRect.top - 6, 8),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      ) : null}
      <div
        className="absolute w-[min(22rem,calc(100vw-2rem))] rounded-lg border bg-background p-4 shadow-xl pointer-events-auto"
        style={popoverStyle}
      >
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          Step {index + 1} of {steps.length}
        </p>
        <h2 className="mt-1 text-base font-semibold">{step.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>
            Skip
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => (last ? finish() : setIndex((current) => current + 1))}
            >
              {last ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function restartProductTour() {
  window.dispatchEvent(new Event(eventName));
}

export function ProductTourButton() {
  return (
    <button
      type="button"
      data-tour="global-help"
      onClick={restartProductTour}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Restart product tour"
      title="Restart product tour"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}

function resolvePageKey(pathname: string) {
  if (pathname.startsWith("/beneficiaries")) return "/beneficiaries";
  if (pathname.startsWith("/pipeline")) return "/pipeline";
  if (pathname.startsWith("/evidence")) return "/evidence";
  if (pathname.startsWith("/settings")) return "/settings";
  if (pathname.startsWith("/dashboard")) return "/dashboard";
  return null;
}

function storageKey(pageKey: string, userKey: string) {
  return `impactops-tour:${userKey}:${pageKey}`;
}

function getPopoverStyle(rect: DOMRect | null): CSSProperties {
  if (!rect) {
    return {
      left: "1rem",
      bottom: "1rem",
    };
  }
  const topSpace = rect.top;
  const bottomSpace = window.innerHeight - rect.bottom;
  const preferTop = bottomSpace < 220 && topSpace > bottomSpace;
  const top = preferTop ? Math.max(rect.top - 180, 16) : Math.min(rect.bottom + 18, window.innerHeight - 220);
  const left = Math.min(Math.max(rect.left, 16), window.innerWidth - 368);
  return {
    top,
    left,
  };
}
