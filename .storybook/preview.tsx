import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    // fill the whole preview iframe so pointer lock/mouse-look feels natural,
    // instead of Storybook's default padded layout
    layout: 'fullscreen'
  }
};

export default preview;
