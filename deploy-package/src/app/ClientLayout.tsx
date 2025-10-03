"use client";
import { ReactNode, useEffect, useState } from "react";

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [pathname, setPathname] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updatePath = () => {
      setPathname(window.location.pathname);
    };

    const handlePopState = () => updatePath();
    const handleLocationChange = () => updatePath();

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const wrapHistoryMethod = (
      method: typeof window.history.pushState,
      eventName: "pushstate" | "replacestate",
    ) => {
      return function wrappedHistoryMethod(this: History, ...args: Parameters<typeof window.history.pushState>) {
        const result = method.apply(this, args);
        window.dispatchEvent(new Event(eventName));
        window.dispatchEvent(new Event("locationchange"));
        return result;
      };
    };

    window.history.pushState = wrapHistoryMethod(originalPushState, "pushstate");
    window.history.replaceState = wrapHistoryMethod(originalReplaceState, "replacestate");

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pushstate", handleLocationChange);
    window.addEventListener("replacestate", handleLocationChange);
    window.addEventListener("locationchange", handleLocationChange);

    updatePath();

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pushstate", handleLocationChange);
      window.removeEventListener("replacestate", handleLocationChange);
      window.removeEventListener("locationchange", handleLocationChange);
    };
  }, []);

  let className = "pt-28";
  if (pathname.startsWith("/simulation")) {
    className = "min-h-screen bg-slate-50";
  } else if (pathname === "/scenario") {
    className = "pt-6";
  }

  return <main className={className}>{children}</main>;
}
