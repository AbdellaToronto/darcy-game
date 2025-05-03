"use client";

import { useRef } from "react";
import { IRefPhaserGame, PhaserGame } from "./phaser-game";
// Import scene types if you need to check scene keys or call scene methods
// import { MainScene } from '@/lib/phaser/scenes/main-scene';
import * as Phaser from "phaser";

export default function PistonGameApp() {
  // State/Ref can remain if needed later for other UI or direct interaction
  // const [canDoSomething, setCanDoSomething] = useState(false);
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  // Callback can also remain for debugging or future use
  const handleCurrentScene = (scene: Phaser.Scene) => {
    console.log("React received scene ready:", scene.scene.key);
    // setCanDoSomething(scene.scene.key === "MainScene");
  };

  // Example action function can be removed or kept for later
  // const exampleAction = () => { ... };

  return (
    // Container still fills height/width
    <div id="app-container" className="relative w-full h-full">
      {/* The Phaser game canvas component */}
      <PhaserGame ref={phaserRef} currentActiveScene={handleCurrentScene} />

      {/* REMOVED the React Controls div */}
      {/* <div className="absolute bottom-4 left-4 z-10 ..."> ... </div> */}
    </div>
  );
}
