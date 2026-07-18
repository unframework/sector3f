import React from 'react';

import { PlaygroundStage } from './storybook/PlaygroundStage';
import { SimpleLevel } from './SimpleLevel';

// a whole level dropped straight in, without going through IntroLevel/LevelSequence
//
// note: not using Storybook's Meta/StoryObj types here - @storybook/react-vite's
// package.json is exports-map-only, which this project's TypeScript (~4.1) can't resolve
const meta = {
  title: 'Level/SimpleLevel',
  render: () => (
    <PlaygroundStage>
      <SimpleLevel onComplete={() => {}} />
    </PlaygroundStage>
  )
};

export default meta;

export const Default = {};
