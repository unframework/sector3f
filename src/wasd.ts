import { useState, useLayoutEffect, useRef } from 'react';

// X-axis, Y-axis, sprint
export type WASDState = [number, number, boolean];

// exposes an object that gets updated imperatively, meant for polling
export function useWASD(): WASDState {
  // not actually using state changes
  const [state] = useState<WASDState>(() => [0, 0, false]);

  useLayoutEffect(() => {
    const keys: Record<string, boolean | undefined> = {};

    function recomputeState() {
      state[0] = (keys.a ? -1 : 0) + (keys.d ? 1 : 0);
      state[1] = (keys.s ? -1 : 0) + (keys.w ? 1 : 0);
      state[2] = !!keys.shift;
    }

    // key listener
    const mainHandler = (modeDown: boolean, event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      switch (key) {
        case 'a':
        case 'd':
        case 'w':
        case 's':
        case 'shift':
          keys[key] = modeDown;
          recomputeState();
          break;
      }
    };
    const downHandler = mainHandler.bind(null, true);
    const upHandler = mainHandler.bind(null, false);

    // window blur
    const blurHandler = () => {
      for (const k of Object.keys(keys)) {
        keys[k] = false;
      }
      recomputeState();
    };

    // hook up events
    document.body.addEventListener('keydown', downHandler);
    document.body.addEventListener('keyup', upHandler);
    window.addEventListener('blur', blurHandler);

    return () => {
      // clean up events
      document.body.removeEventListener('keydown', downHandler);
      document.body.removeEventListener('keyup', upHandler);
      window.removeEventListener('blur', blurHandler);
    };
  }, []);

  return state;
}

// return simple state object that can be polled in the game loop
interface CameraLookState {
  isLocked: boolean;
  yaw: number;
  pitch: number;
}

// exposes an object that gets updated imperatively, meant for polling
export function useCameraLook(): CameraLookState {
  // not actually using state changes
  const [state] = useState(() => ({
    isLocked: false,
    yaw: 0,
    pitch: Math.PI / 2 // zero means facing "down", so start facing forward
  }));

  useLayoutEffect(() => {
    const moveHandler = (event: MouseEvent) => {
      // @todo enable this
      if (!state.isLocked) {
        return;
      }

      const movementX =
        // @ts-ignore
        event.movementX || event.mozMovementX || event.webkitMovementX || 0;
      const movementY =
        // @ts-ignore
        event.movementY || event.mozMovementY || event.webkitMovementY || 0;

      let yaw = state.yaw - movementX * 0.004;
      if (yaw < -Math.PI) {
        yaw += 2 * Math.PI;
      } else if (yaw >= Math.PI) {
        yaw -= 2 * Math.PI;
      }
      state.yaw = yaw;

      state.pitch = Math.max(
        0,
        Math.min(Math.PI, state.pitch - movementY * 0.004)
      );
    };

    const pointerLockHandler = () => {
      state.isLocked = document.pointerLockElement === document.body;
    };

    // hook up events
    document.body.addEventListener('mousemove', moveHandler);
    document.addEventListener('pointerlockchange', pointerLockHandler);

    return () => {
      // clean up events
      document.body.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('pointerlockchange', pointerLockHandler);
    };
  }, []);

  return state;
}
