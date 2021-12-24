import { useState, useLayoutEffect, useRef } from 'react';

// @todo return an event stream instead of causing rerenders on every change?
// this is because stick controls do not affect orchestration directly
export function useWASD(): [number, number] {
  const [keys, setKeys] = useState<Record<string, boolean | undefined>>({});

  useLayoutEffect(() => {
    // key listener
    const mainHandler = (modeDown: boolean, event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      switch (key) {
        case 'a':
        case 'd':
        case 'w':
        case 's':
          setKeys(prev => {
            // avoid triggering re-render if same state
            if (!!prev[key] === modeDown) {
              return prev;
            }

            return { ...prev, [key]: modeDown };
          });
          break;
      }
    };
    const downHandler = mainHandler.bind(null, true);
    const upHandler = mainHandler.bind(null, false);

    // window blur
    const blurHandler = () => {
      setKeys({});
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

  // compute active "input stick" values
  const keyMotionX = (keys.a ? -1 : 0) + (keys.d ? 1 : 0);
  const keyMotionY = (keys.s ? -1 : 0) + (keys.w ? 1 : 0);

  return [keyMotionX, keyMotionY];
}

// return simple state object that can be polled in the game loop
interface CameraLookState {
  isLocked: boolean;
  yaw: number;
  pitch: number;
}

// exposes an object that gets updated imperatively, meant for polling
export function useCameraLook(
  onUpdate: (state: CameraLookState) => void
): CameraLookState {
  // referenced inside event handlers
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // not actually using state changes
  const [state] = useState(() => ({
    isLocked: false,
    yaw: 0,
    pitch: Math.PI / 2 // zero means facing "down", so start facing forward
  }));

  useLayoutEffect(() => {
    const moveHandler = (event: MouseEvent) => {
      // @todo enable this
      // if (!state.isLocked) {
      //   return;
      // }

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

      if (onUpdateRef.current) {
        onUpdateRef.current(state);
      }
    };

    const pointerLockHandler = () => {
      state.isLocked = document.pointerLockElement === document.body;

      if (onUpdateRef.current) {
        onUpdateRef.current(state);
      }
    };

    // hook up events
    document.body.addEventListener('mousemove', moveHandler);
    document.body.addEventListener('pointerlockchange', pointerLockHandler);

    return () => {
      // clean up events
      document.body.removeEventListener('mousemove', moveHandler);
      document.body.removeEventListener(
        'pointerlockchange',
        pointerLockHandler
      );
    };
  }, []);

  return state;
}
