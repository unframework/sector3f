import React, { useState, useRef, useEffect, useContext } from 'react';
import * as b2 from '@flyover/box2d';
import * as THREE from 'three';

// @todo avoid using globals
import { g_debugDraw, g_camera } from './box2dDebugDraw';

type Updater = () => void;
type ListenerTuple = [b2.Body, b2.Vec2, THREE.Object3D];
interface PhysicsInfo {
  world: b2.World;
  bodyUpdaters: Updater[];
  bodyListeners: ListenerTuple[];
}
const PhysicsContext = React.createContext<PhysicsInfo | null>(null);

function createStepTimer(physicsStepDuration: number, onTick: () => void) {
  let lastTime = performance.now(),
    physicsStepAccumulator = 0;

  let isStopped = false;

  function update() {
    if (isStopped) {
      return;
    }

    const time = performance.now();
    const elapsed = Math.max(0, Math.min(0.1, (time - lastTime) / 1000));

    lastTime = time;

    physicsStepAccumulator += elapsed;

    while (physicsStepAccumulator > physicsStepDuration) {
      onTick();
      physicsStepAccumulator -= physicsStepDuration;
    }

    // restart
    requestAnimationFrame(update);
  }

  // kick off initial run in next RAF tick
  requestAnimationFrame(update);

  return {
    stop() {
      isStopped = true;
    }
  };
}

const STEP = 1 / 60;

export const TopDownPhysics: React.FC = ({ children }) => {
  // initialize context value
  const [activeContextValue] = useState<PhysicsInfo>(() => {
    const world = new b2.World(new b2.Vec2(0, 0));
    const bodyUpdaters: Updater[] = [];
    const bodyListeners: ListenerTuple[] = [];

    return { world, bodyListeners, bodyUpdaters };
  });

  useEffect(() => {
    const { world, bodyUpdaters, bodyListeners } = activeContextValue;

    const upVector = new THREE.Vector3(0, 0, 1); // reusable helper

    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.className = 'physicsDebug';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d')!;

    g_camera.m_center.x = 0;
    g_camera.m_center.y = 0;
    g_camera.m_extent = 5;
    g_camera.m_width = canvas.width;
    g_camera.m_height = canvas.height;

    g_debugDraw.m_ctx = ctx;
    g_debugDraw.m_drawFlags = b2.DrawFlags.e_shapeBit;

    world.SetDebugDraw(g_debugDraw);

    const timer = createStepTimer(STEP, () => {
      // update bodies before solve
      for (let i = 0; i < bodyUpdaters.length; i += 1) {
        bodyUpdaters[i]();
      }

      // solve physics
      world.Step(STEP, 3, 3);

      // debug draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(0.5 * canvas.width, 0.5 * canvas.height);
      ctx.scale(1, -1);

      const s: number = (0.5 * g_camera.m_height) / g_camera.m_extent;
      ctx.scale(s, s);
      ctx.lineWidth /= s;

      ctx.scale(1 / g_camera.m_zoom, 1 / g_camera.m_zoom);
      ctx.lineWidth *= g_camera.m_zoom;
      ctx.translate(-g_camera.m_center.x, -g_camera.m_center.y);

      world.DebugDraw();

      ctx.restore();

      // update rendered objects
      for (let i = 0; i < bodyListeners.length; i += 1) {
        const [body, bodyPos, target] = bodyListeners[i];

        target.position.x = bodyPos.x;
        target.position.y = bodyPos.y;
        target.quaternion.setFromAxisAngle(upVector, body.GetAngle());
        target.matrixWorldNeedsUpdate = true;
      }
    });

    return () => {
      timer.stop();

      // clean up debug
      canvas.parentElement!.removeChild(canvas);
    };
  }, [activeContextValue]);

  return (
    <PhysicsContext.Provider value={activeContextValue}>
      {children}
    </PhysicsContext.Provider>
  );
};

// not changing body angle - for movable NPC/player entities, the assumption is
// that the character "direction" is a purely visual concern
// (not e.g. generating friction force when turning to change movement direction)
export const FPSBody: React.FC<{
  radius: number;
  movement: [number, number];
  look: { yaw: number };
}> = ({ radius, movement, look }) => {
  // one-time read
  const initialRadiusRef = useRef(radius);

  // reference for polling
  const movementRef = useRef(movement);
  movementRef.current = movement;
  const lookRef = useRef(look);
  lookRef.current = look;

  const [parentObject, setParentObject] = useState<THREE.Object3D | null>(null);
  const groupRef = useRef<THREE.Object3D | null>(null);

  const info = useContext(PhysicsContext);
  if (!info) {
    throw new Error('expecting b2.World');
  }

  // initialize the physics object
  useEffect(() => {
    const { world, bodyUpdaters, bodyListeners } = info;

    if (!groupRef.current) {
      throw new Error('must attach to ThreeJS tree');
    }

    const fpsObject = groupRef.current.parent;
    if (!fpsObject) {
      throw new Error('must attach under ThreeJS object');
    }

    setParentObject(fpsObject);

    // computation helper
    const impulseTmp = new b2.Vec2(0, 0);

    const bodyDef = new b2.BodyDef();
    const fixDef = new b2.FixtureDef();

    bodyDef.type = b2.dynamicBody;
    bodyDef.position.x = fpsObject.position.x;
    bodyDef.position.y = fpsObject.position.y;
    bodyDef.angle = 0;
    bodyDef.linearDamping = 10;
    bodyDef.angularDamping = 10;
    bodyDef.fixedRotation = true;
    const body = world.CreateBody(bodyDef);

    const shape = (fixDef.shape = new b2.CircleShape());
    shape.Set(new b2.Vec2(0, 0), initialRadiusRef.current);
    fixDef.density = 200.0; // this arrives at about 40kg mass
    fixDef.friction = 0.1;
    fixDef.restitution = 0.0;
    body.CreateFixture(fixDef);

    const mass = body.GetMass();

    // per-frame control
    const updater = () => {
      // apply motion as minimum movement impulse against linear damping
      const [mx, my] = movementRef.current;
      const { yaw } = lookRef.current;

      // use Y-axis as the "forward" direction
      impulseTmp.Set(mx, my);
      if (mx || my) {
        impulseTmp.SelfNormalize();
        impulseTmp.SelfRotate(yaw);
      }

      impulseTmp.SelfMul(STEP * mass * 45);
      body.ApplyLinearImpulseToCenter(impulseTmp);
    };
    bodyUpdaters.push(updater);

    const tuple: ListenerTuple = [body, body.GetPosition(), fpsObject];
    bodyListeners.push(tuple);

    // clean up
    return () => {
      world.DestroyBody(body);

      const updaterIndex = bodyUpdaters.indexOf(updater);
      if (updaterIndex === -1) {
        console.error('updater disappeared?');
      } else {
        bodyUpdaters.splice(updaterIndex, 1);
      }

      const tupleIndex = bodyListeners.indexOf(tuple);
      if (tupleIndex === -1) {
        console.error('listener tuple disappeared?');
      } else {
        bodyListeners.splice(tupleIndex, 1);
      }
    };
  }, [info]);

  // if parentObject is known, then no need to render the group anymore
  return parentObject ? null : <group ref={groupRef} />;
};

export const Body: React.FC<{
  isStatic?: boolean;
  initShape?: () => b2.Shape;
}> = ({ isStatic, initShape }) => {
  const initShapeRef = useRef(initShape); // storing value only once

  const [parentObject, setParentObject] = useState<THREE.Object3D | null>(null);
  const groupRef = useRef<THREE.Object3D | null>(null);

  const info = useContext(PhysicsContext);
  if (!info) {
    throw new Error('expecting b2.World');
  }

  // initialize the physics object
  useEffect(() => {
    const { world, bodyListeners } = info;

    if (!groupRef.current) {
      throw new Error('must attach to ThreeJS tree');
    }

    const meshObject = groupRef.current.parent;
    if (!(meshObject instanceof THREE.Mesh)) {
      throw new Error('must attach under ThreeJS mesh');
    }

    const meshGeom = meshObject.geometry;

    const bodyDef = new b2.BodyDef();
    const fixDef = new b2.FixtureDef();

    bodyDef.type = isStatic ? b2.staticBody : b2.dynamicBody;
    bodyDef.position.x = meshObject.position.x;
    bodyDef.position.y = meshObject.position.y;
    bodyDef.linearDamping = 1;
    bodyDef.angularDamping = 1;

    fixDef.density = 300.0;
    fixDef.friction = 0.8;
    fixDef.restitution = 0.0;

    if (meshGeom instanceof THREE.BoxBufferGeometry) {
      const shape = new b2.PolygonShape();
      // reduce by m_radius - the "polygon skin" width - to avoid gaps
      shape.SetAsBox(
        meshGeom.parameters.width / 2 - shape.m_radius,
        meshGeom.parameters.height / 2 - shape.m_radius
      );
      fixDef.shape = shape;
    } else {
      if (!initShapeRef.current) {
        throw new Error('must specify shape init if not BoxBufferGeometry');
      }

      const shape = initShapeRef.current();
      fixDef.shape = shape;
    }

    setParentObject(meshObject);

    const body = world.CreateBody(bodyDef);
    body.CreateFixture(fixDef);

    const tuple: ListenerTuple | null = isStatic
      ? null
      : [body, body.GetPosition(), meshObject];
    if (tuple) {
      bodyListeners.push(tuple);
    }

    // clean up
    return () => {
      world.DestroyBody(body);

      if (tuple) {
        const tupleIndex = bodyListeners.indexOf(tuple);
        if (tupleIndex === -1) {
          console.error('listener tuple disappeared?');
        } else {
          bodyListeners.splice(tupleIndex, 1);
        }
      }
    };
  }, [isStatic, info]);

  // if parentObject is known, then no need to render the group anymore
  return parentObject ? null : <group ref={groupRef} />;
};
