import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: [],
  framework: '@storybook/react-vite',
  core: {
    // allow accessing the dev server via a tailscale serve hostname
    // (this is Storybook's own host check, separate from Vite's)
    allowedHosts: ['.ts.net']
  },
  viteFinal: async config => {
    config.resolve = config.resolve || {};
    // @react-three/lightmap is linked from a local checkout with its own
    // nested node_modules - force a single react/three/fiber instance app-wide
    config.resolve.dedupe = [
      ...(config.resolve.dedupe || []),
      'react',
      'react-dom',
      'three',
      '@react-three/fiber'
    ];
    config.optimizeDeps = config.optimizeDeps || {};
    config.optimizeDeps.exclude = [
      ...(config.optimizeDeps.exclude || []),
      '@react-three/lightmap'
    ];

    // allow accessing the dev server via a tailscale funnel/serve hostname
    config.server = config.server || {};
    config.server.allowedHosts = [
      ...((config.server.allowedHosts as string[] | undefined) || []),
      '.ts.net'
    ];

    return config;
  }
};

export default config;
