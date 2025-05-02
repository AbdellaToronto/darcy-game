"use client"; // Mark this specifically as a Client Component

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import the MAIN app component with SSR turned off
// This is now happening inside a Client Component
const PistonGameApp = dynamic(
  () => import("@/components/game/piston-game-app"), // Default export
  {
    ssr: false,
    loading: () => (
      // Full height/width loading state
      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
        Loading Game App...
      </div>
    ),
  }
);

export default function GameClientLoader() {
  // This component just renders the dynamically imported PistonGameApp
  // Suspense is needed here to handle the loading state of the dynamic import
  return (
    <Suspense
      fallback={
        // Full height/width fallback
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          Initializing Loader...
        </div>
      }
    >
      <PistonGameApp />
    </Suspense>
  );
}
