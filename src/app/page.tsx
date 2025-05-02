import { Suspense } from "react";
// Remove dynamic import from the page
// import dynamic from 'next/dynamic';

// Import the new client loader component directly
import GameClientLoader from "@/components/game/game-client-loader";

// This page remains a Server Component but doesn't force centering
export default function GamePage() {
  return (
    // Make the page container take full height and set background
    <div className="h-full bg-gray-900 text-white">
      {/* Optional: Keep title if desired, maybe position differently */}
      {/* <h1 className="absolute top-4 left-4 text-2xl font-bold z-10">Piston Platformer</h1> */}

      {/* Suspense boundary for the client component */}
      <Suspense
        fallback={
          // Make fallback also full screen
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            Loading Game Loader...
          </div>
        }
      >
        {/* Render the client loader, it should fill the page */}
        <GameClientLoader />
      </Suspense>

      {/* Optional: remove this paragraph */}
      {/* <p className="mt-4 text-sm text-gray-400">
        Game controls and canvas should appear above.
      </p> */}
    </div>
  );
}
