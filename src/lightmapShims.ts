import React from 'react';
import {
  LightmapReadOnly as LightmapReadOnlyUntyped,
  LightmapIgnore as LightmapIgnoreUntyped
} from '@react-three/lightmap';

// @react-three/lightmap@0.0.8 declares these as plain `React.FC` with no
// children prop, which @types/react 18 no longer infers implicitly
export const LightmapReadOnly = LightmapReadOnlyUntyped as React.FC<
  React.PropsWithChildren<{}>
>;
export const LightmapIgnore = LightmapIgnoreUntyped as React.FC<
  React.PropsWithChildren<{}>
>;
