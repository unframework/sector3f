import { useState, useLayoutEffect } from 'react';

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
