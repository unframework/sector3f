import React from 'react';

import { PlaygroundStage } from '../storybook/PlaygroundStage';
import { LevelMesh } from '../levelMesh';
import { UtilityStair, UtilityCorridor } from './UtilityCorridor';

// template for testing a single reusable level fixture in isolation:
// LevelMesh bakes the floor collision/Z-height query the FPS body needs,
// and PlaygroundStage supplies the same camera/movement/physics loop as the real game
//
// note: not using Storybook's Meta/StoryObj types here - @storybook/react-vite's
// package.json is exports-map-only, which this project's TypeScript (~4.1) can't resolve
const meta = {
  title: 'Level/UtilityCorridor',
  render: () => (
    <PlaygroundStage>
      <LevelMesh>
        {/* PlaygroundStage spawns the player near local (1, 1, z), so keep a
            corridor centered there rather than at the world origin */}
        <group position={[1, 2, 0]}>
          <UtilityCorridor />
        </group>
        <group position={[1, 6, 0]}>
          <UtilityCorridor color="#ffff00" />
        </group>

        <group position={[-3, 2, -0.5]}>
          <UtilityStair />
        </group>
      </LevelMesh>
    </PlaygroundStage>
  )
};

export default meta;

export const Default = {};
