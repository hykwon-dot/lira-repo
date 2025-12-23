"use client";
import { useEffect, useState } from "react";
import ChatSimulation from "./ChatSimulation";

const useViewportHeight = () => {
  const [height, setHeight] = useState("100dvh");
  useEffect(() => {
    const update = () => setHeight(`${window.innerHeight}px`);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
};

export default function SimulationPage() {
  const viewportHeight = useViewportHeight();
  return (
    <div
      style={{ minHeight: viewportHeight }}
      className="flex flex-col overflow-hidden"
    >
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatSimulation />
      </main>
    </div>
  );
}
