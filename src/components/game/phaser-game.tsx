"use client";

import { forwardRef, useEffect, useRef } from "react";
// Use namespace import for Phaser again
import * as Phaser from "phaser";
import StartGame from "@/lib/phaser/main"; // Import the initializer
import { EventBus } from "@/lib/phaser/event-bus";

// Interface for the ref to expose game/scene instances
export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

// Interface for the component props (callback for scene changes)
interface IProps {
  currentActiveScene?: (scene_instance: Phaser.Scene) => void;
}

// Unique ID for the Phaser game container
const PHASER_CONTAINER_ID = "phaser-game-container";

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(
  function PhaserGameComponent({ currentActiveScene }, ref) {
    const game = useRef<Phaser.Game | null>(null);

    // Use useEffect for asynchronous DOM measurements/mutations if needed,
    // otherwise useEffect is generally preferred.
    // The template uses useLayoutEffect, so we mirror it.
    useEffect(() => {
      if (game.current === null) {
        // Initialize the game only once
        game.current = StartGame(PHASER_CONTAINER_ID);
        console.log("Phaser game started via StartGame.");

        // Set the initial ref value
        if (typeof ref === "function") {
          ref({ game: game.current, scene: null });
        } else if (ref) {
          ref.current = { game: game.current, scene: null };
        }
      }

      // Cleanup function to destroy the game on unmount
      return () => {
        if (game.current) {
          console.log("Destroying Phaser game instance on unmount...");
          game.current.destroy(true);
          game.current = null;
          console.log("Phaser game instance destroyed.");
        }
      };
    }, [ref]);

    // Effect to handle scene changes via EventBus
    useEffect(() => {
      const listener = (scene_instance: Phaser.Scene) => {
        if (currentActiveScene && typeof currentActiveScene === "function") {
          currentActiveScene(scene_instance);
        }

        // Update the ref with the current scene
        if (typeof ref === "function") {
          ref({ game: game.current, scene: scene_instance });
        } else if (ref) {
          ref.current = { game: game.current, scene: scene_instance };
        }
      };

      EventBus.on("current-scene-ready", listener);

      // Cleanup event listener on unmount
      return () => {
        EventBus.off("current-scene-ready", listener);
      };
    }, [currentActiveScene, ref]);

    // Render the container div for Phaser, make it fill the parent
    return <div id={PHASER_CONTAINER_ID} className="w-full h-full" />;
  }
);

// Optional: Default export if preferred
// export default PhaserGame;
