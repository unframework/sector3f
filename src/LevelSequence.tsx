import React, { useLayoutEffect, useState, useRef } from 'react';
import * as b2 from '@flyover/box2d';

import { TopDownPhysics } from './physics';
import { IntroLevel } from './IntroLevel';

export type LevelCompletionCallback = (
  nextLevel: LevelRenderer,
  teleportOrigin: [number, number]
) => void;
export type LevelRenderer = (
  onComplete: LevelCompletionCallback
) => React.ReactElement;

const CompletionTracker: React.FC<{ onComplete: () => void }> = ({
  onComplete
}) => {
  // keep latest reference
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    return () => {
      onCompleteRef.current();
    };
  }, []);

  return null;
};

interface LevelStackItem {
  teleportFrom?: [number, number];
  renderer: LevelRenderer;
}

export const LevelSequence: React.FC<{
  camera: (
    bodyRef: React.MutableRefObject<b2.Body | undefined>,
    cloneBody?: b2.Body,
    cloneOrigin?: [number, number]
  ) => React.ReactElement;
  initialLoader: React.ReactElement;
}> = ({ camera, initialLoader }) => {
  const fpsBodyRef = useRef<b2.Body>();

  const [levelStack, setLevelStack] = useState<LevelStackItem[]>(() => [
    { renderer: onComplete => <IntroLevel onComplete={onComplete} /> }
  ]);

  // which level to show FPS camera in?
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);

  // active level's FPS body for teleporting (not putting this on level stack to avoid mem leak)
  const exitingFpsBodyRef = useRef<b2.Body>();

  return (
    <>
      {levelStack.map(({ renderer, teleportFrom }, levelIndex) => {
        // discard past level instances
        if (levelIndex < activeLevelIndex - 1) {
          return null;
        }

        // space out the level instances on X axis
        const levelOffsetX = levelIndex * 8;

        const completionCb: LevelCompletionCallback = (
          nextLevelRenderer,
          localTeleportOrigin
        ) => {
          console.log('level', levelIndex, 'complete');

          // convert coordinates for exit point from this level into world position
          const worldTeleportOrigin: [number, number] = [
            localTeleportOrigin[0] + levelOffsetX,
            localTeleportOrigin[1]
          ];

          // stash reference to active FPS body for upcoming teleport
          exitingFpsBodyRef.current = fpsBodyRef.current;

          // push the next level to start being rendered/baked/etc
          setLevelStack(prev => [
            ...prev,
            { teleportFrom: worldTeleportOrigin, renderer: nextLevelRenderer }
          ]);
        };

        const loadedCb = () => {
          console.log('level', levelIndex, 'ready');
          setTimeout(
            () => setActiveLevelIndex(prev => Math.max(prev, levelIndex)),
            200
          );
        };

        // render actual level contents
        const levelContents = renderer(completionCb);

        // position, suspense, physics wrapper with FPS body controller
        return (
          <group key={levelIndex} position={[levelOffsetX, 0, 0]}>
            <React.Suspense
              fallback={
                levelIndex === 0 ? (
                  initialLoader
                ) : (
                  <CompletionTracker onComplete={loadedCb} />
                )
              }
            >
              <TopDownPhysics>
                {levelContents}

                <group position={[1, 1, 0]}>
                  {levelIndex === activeLevelIndex
                    ? camera(
                        fpsBodyRef,
                        exitingFpsBodyRef.current,
                        teleportFrom
                      )
                    : null}
                </group>
              </TopDownPhysics>
            </React.Suspense>
          </group>
        );
      })}
    </>
  );
};
