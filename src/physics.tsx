import React, { useState, useRef, useEffect, useContext } from 'react';
import * as b2 from '@flyover/box2d';
import * as THREE from 'three';

import { WASDState } from './wasd';
import { ThreeDummy } from './scene';
import { g_debugDraw, g_camera } from './box2dDebugDraw';

export type ZQuery = (x: number, y: number) => number | null;

type Updater = () => void;
type ListenerTuple = [b2.Body, b2.Vec2, THREE.Object3D, number, THREE.Matrix4];
interface PhysicsInfo {
  world: b2.World;
  bodyUpdaters: Updater[];
  bodyPostUpdaters: Updater[];
  bodyListeners: ListenerTuple[];
  zQuery: ZQuery | null;
}
const PhysicsContext = React.createContext<PhysicsInfo | null>(null);

const FPS_CATEGORY_BIT = 1 << 1; // FPS body collision mask bit

export function useZQueryProvider(zQuery: ZQuery | null) {
  const info = useContext(PhysicsContext);
  if (!info) {
    throw new Error('expecting b2.World');
  }

  const zQueryRef = useRef(zQuery);
  zQueryRef.current = zQuery;

  useEffect(() => {
    info.zQuery = (x, y) => zQueryRef.current && zQueryRef.current(x, y);

    return () => {
      // @todo safety check
      info.zQuery = null;
    };
  }, [info]);
}

// @todo move certain things to onFrame instead of onTick
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

const DUMMY_Z_QUERY = () => null;

// draw all the ongoing simulations at once, for current global camera view
const debugWorldList: b2.World[] = [];
export const DebugTopDownPhysics: React.FC = ({ children }) => {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.className = 'physicsDebug';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d')!;

    g_camera.m_center.x = 0;
    g_camera.m_center.y = 0;
    g_camera.m_extent = 10;
    g_camera.m_width = canvas.width;
    g_camera.m_height = canvas.height;

    g_debugDraw.m_ctx = ctx;
    g_debugDraw.m_drawFlags = b2.DrawFlags.e_shapeBit;

    // RAF loop
    let isStopped = false;

    function update() {
      if (isStopped) {
        return;
      }

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

      for (const world of debugWorldList) {
        world.DebugDraw();
      }

      ctx.restore();

      // restart
      requestAnimationFrame(update);
    }

    // kick off initial run in next RAF tick
    requestAnimationFrame(update);

    // clean up canvas and RAF
    return () => {
      isStopped = true;
      canvas.parentElement!.removeChild(canvas);
    };
  }, []);

  return null;
};

export const TopDownPhysics: React.FC = ({ children }) => {
  // initialize context value
  const [activeContextValue] = useState<PhysicsInfo>(() => {
    const world = new b2.World(new b2.Vec2(0, 0));
    const bodyUpdaters: Updater[] = [];
    const bodyPostUpdaters: Updater[] = [];
    const bodyListeners: ListenerTuple[] = [];

    return {
      world,
      bodyListeners,
      bodyUpdaters,
      bodyPostUpdaters,
      zQuery: null
    };
  });

  useEffect(() => {
    const {
      world,
      bodyUpdaters,
      bodyPostUpdaters,
      bodyListeners
    } = activeContextValue;

    const upVector = new THREE.Vector3(0, 0, 1); // reusable helper
    const tmpPosVector = new THREE.Vector3(); // reusable helper

    world.SetDebugDraw(g_debugDraw);
    debugWorldList.push(world);

    const timer = createStepTimer(STEP, () => {
      // update bodies before solve
      for (let i = 0; i < bodyUpdaters.length; i += 1) {
        bodyUpdaters[i]();
      }

      // solve physics
      world.Step(STEP, 3, 3);

      // get latest Z-query for this frame
      const zQuery = activeContextValue.zQuery || DUMMY_Z_QUERY;

      // update bodies after solve
      for (let i = 0; i < bodyPostUpdaters.length; i += 1) {
        bodyPostUpdaters[i]();
      }

      // update rendered objects
      // @todo this outside of the fixed step loop - per-frame instead
      for (let i = 0; i < bodyListeners.length; i += 1) {
        const [body, bodyPos, target, zOffset, parentInverse] = bodyListeners[
          i
        ];

        const zPos = zQuery(bodyPos.x, bodyPos.y);

        // apply positioning within parent's frame of reference
        tmpPosVector.x = bodyPos.x;
        tmpPosVector.y = bodyPos.y;
        if (zPos !== null) {
          tmpPosVector.z = zPos + zOffset;
        }

        tmpPosVector.applyMatrix4(parentInverse);

        target.position.x = tmpPosVector.x;
        target.position.y = tmpPosVector.y;
        if (zPos !== null) {
          // apply basic smoothing for retro stair-step feel for large Z changes
          const delta = tmpPosVector.z - target.position.z;
          target.position.z += Math.abs(delta) < 0.1 ? delta : delta * 0.25;
        }

        // @todo also respect parent's transform for this? or just disallow xform for dynamic bodies?
        target.quaternion.setFromAxisAngle(upVector, body.GetAngle());
        target.matrixWorldNeedsUpdate = true;
      }
    });

    return () => {
      timer.stop();

      const index = debugWorldList.indexOf(world);
      if (index !== -1) {
        debugWorldList.splice(index, 1);
      }
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
  movement: WASDState;
  look: { yaw: number };
  bodyRef?: React.MutableRefObject<b2.Body | undefined>;
  cloneBody?: b2.Body; // when creating, clone dynamics from given body
  cloneOrigin?: [number, number];
}> = ({ radius, movement, look, bodyRef, cloneBody, cloneOrigin }) => {
  // one-time read
  const initialRadiusRef = useRef(radius);

  // reference for polling
  const movementRef = useRef(movement);
  movementRef.current = movement;
  const lookRef = useRef(look);
  lookRef.current = look;

  const info = useContext(PhysicsContext);
  if (!info) {
    throw new Error('expecting b2.World');
  }

  // initialize the physics object
  const init = (fpsObject: THREE.Object3D) => {
    const { world, bodyUpdaters, bodyListeners } = info;

    // computation helper
    const impulseTmp = new b2.Vec2(0, 0);

    // @todo also deal with body rotation
    fpsObject.updateWorldMatrix(true, false); // @todo avoid if already updated?
    tmpVector.copy(fpsObject.position);
    tmpVector.applyMatrix4(fpsObject.parent!.matrixWorld); // also apply the parent's transform before inverting

    const parentInverse = new THREE.Matrix4();
    parentInverse.copy(fpsObject.parent!.matrixWorld);
    parentInverse.invert();

    const bodyDef = new b2.BodyDef();
    const fixDef = new b2.FixtureDef();

    bodyDef.type = b2.dynamicBody;
    bodyDef.position.Set(tmpVector.x, tmpVector.y);
    bodyDef.linearDamping = 10;
    bodyDef.angularDamping = 10;
    bodyDef.fixedRotation = true;

    if (cloneBody) {
      const cloneOriginX = cloneOrigin ? cloneOrigin[0] : 0;
      const cloneOriginY = cloneOrigin ? cloneOrigin[1] : 0;

      // shift position by same relative distance as original from the clone origin
      bodyDef.position.SelfAddXY(
        cloneBody.GetPosition().x - cloneOriginX,
        cloneBody.GetPosition().y - cloneOriginY
      );

      // copy other dynamics
      bodyDef.linearVelocity.Copy(cloneBody.GetLinearVelocity());

      // update the ThreeJS position without waiting for next frame
      // (no need to update angle because the camera already tracks that independently)
      tmpVector.x = bodyDef.position.x;
      tmpVector.y = bodyDef.position.y;
      tmpVector.applyMatrix4(parentInverse);
      fpsObject.position.copy(tmpVector);
    }

    const body = world.CreateBody(bodyDef);

    const zOffset = fpsObject.position.z; // for later

    const shape = (fixDef.shape = new b2.CircleShape());
    shape.Set(new b2.Vec2(0, 0), initialRadiusRef.current);
    fixDef.density = 200.0; // this arrives at about 40kg mass
    fixDef.friction = 0.1;
    fixDef.restitution = 0.0;
    fixDef.filter.categoryBits |= FPS_CATEGORY_BIT; // add on the extra bit to default
    body.CreateFixture(fixDef);

    const mass = body.GetMass();

    // per-frame control
    const updater = () => {
      // apply motion as minimum movement impulse against linear damping
      const [mx, my, sprint] = movementRef.current;
      const { yaw } = lookRef.current;

      // use Y-axis as the "forward" direction
      impulseTmp.Set(mx, my);
      if (mx || my) {
        impulseTmp.SelfNormalize();
        impulseTmp.SelfRotate(yaw);
      }

      impulseTmp.SelfMul(STEP * mass * (sprint ? 50 : 20));
      body.ApplyLinearImpulseToCenter(impulseTmp);

      // also move the debug view here
      g_camera.m_center.x += (body.GetPosition().x - g_camera.m_center.x) * 0.1;
      g_camera.m_center.y += (body.GetPosition().y - g_camera.m_center.y) * 0.1;
    };
    bodyUpdaters.push(updater);

    const tuple: ListenerTuple = [
      body,
      body.GetPosition(),
      fpsObject,
      zOffset,
      parentInverse
    ];
    bodyListeners.push(tuple);

    // expose reference to body itself
    if (bodyRef) {
      bodyRef.current = body;
    }

    // clean up
    return () => {
      if (bodyRef) {
        bodyRef.current = undefined;
      }

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
  };

  return <ThreeDummy init={init} />;
};

const tmpVector = new THREE.Vector3();
const tmpb2 = new b2.Vec2();

export const Body: React.FC<{
  isStatic?: boolean;
  isKinematic?: boolean;
  initShape?: () => b2.Shape | b2.Shape[];
  isWorldRelative?: boolean;
}> = ({ isStatic, isKinematic, initShape, isWorldRelative }) => {
  const initShapeRef = useRef(initShape); // storing value only once

  const info = useContext(PhysicsContext);
  if (!info) {
    throw new Error('expecting b2.World');
  }

  // initialize the physics object
  const init = (meshObject: THREE.Object3D) => {
    const { world, bodyListeners, bodyUpdaters } = info;

    const meshGeom =
      meshObject instanceof THREE.Mesh ? meshObject.geometry : null;

    // @todo also deal with body rotation
    tmpVector.copy(meshObject.position);
    const parentInverse = new THREE.Matrix4();

    if (!isWorldRelative) {
      // also apply the parent's transform
      meshObject.updateWorldMatrix(true, false); // @todo avoid if already updated?
      tmpVector.applyMatrix4(meshObject.parent!.matrixWorld);

      // prepare inverse transform for feeding physics world position back into ThreeJS
      parentInverse.copy(meshObject.parent!.matrixWorld);
      parentInverse.invert();
    }

    const bodyDef = new b2.BodyDef();
    const fixDef = new b2.FixtureDef();

    bodyDef.type = isStatic
      ? b2.staticBody
      : isKinematic
      ? b2.kinematicBody
      : b2.dynamicBody;
    bodyDef.position.x = tmpVector.x;
    bodyDef.position.y = tmpVector.y;
    bodyDef.linearDamping = 5;
    bodyDef.angularDamping = 5;

    const zOffset = tmpVector.z; // for later

    fixDef.density = 300.0;
    fixDef.friction = 0.8;
    fixDef.restitution = 0.0;

    // get set of shapes for this body
    const shapes: b2.Shape[] = [];
    if (meshGeom instanceof THREE.BoxBufferGeometry) {
      const shape = new b2.PolygonShape();
      // reduce by m_radius - the "polygon skin" width - to avoid gaps
      shape.SetAsBox(
        meshGeom.parameters.width / 2 - shape.m_radius,
        meshGeom.parameters.height / 2 - shape.m_radius
      );
      shapes.push(shape);
    } else {
      if (!initShapeRef.current) {
        throw new Error('must specify shape init if not BoxBufferGeometry');
      }

      const customShapes = initShapeRef.current();
      if (Array.isArray(customShapes)) {
        shapes.push(...customShapes);
      } else {
        shapes.push(customShapes);
      }
    }

    // initialize the actual body object
    const body = world.CreateBody(bodyDef);
    shapes.forEach(shape => {
      fixDef.shape = shape;
      body.CreateFixture(fixDef);
    });

    const bodyPos = body.GetPosition(); // stable reference to vector itself
    const updater = isKinematic
      ? () => {
          // use linear velocity to animate to intended spot
          // @todo investigate a more direct position setter?
          tmpVector.set(0, 0, 0).applyMatrix4(meshObject.matrixWorld);
          tmpb2.Copy(bodyPos);
          tmpb2.SelfSubXY(tmpVector.x, tmpVector.y);
          tmpb2.SelfMul(-1 / STEP); // make velocity high enough to reach destination in next step
          body.SetLinearVelocity(tmpb2);
        }
      : null;
    if (updater) {
      bodyUpdaters.push(updater);
    }

    const tuple: ListenerTuple | null =
      isStatic || isKinematic
        ? null
        : [body, bodyPos, meshObject, zOffset, parentInverse];
    if (tuple) {
      bodyListeners.push(tuple);
    }

    // clean up
    return () => {
      world.DestroyBody(body);

      if (updater) {
        const updaterIndex = bodyUpdaters.indexOf(updater);
        if (updaterIndex === -1) {
          console.error('updater disappeared?');
        } else {
          bodyUpdaters.splice(updaterIndex, 1);
        }
      }

      if (tuple) {
        const tupleIndex = bodyListeners.indexOf(tuple);
        if (tupleIndex === -1) {
          console.error('listener tuple disappeared?');
        } else {
          bodyListeners.splice(tupleIndex, 1);
        }
      }
    };
  };

  return <ThreeDummy init={init} />;
};

export const Sensor: React.FC<{
  initShape: () => b2.Shape | b2.Shape[];
  onChange: (isColliding: boolean) => void;
}> = ({ initShape, onChange }) => {
  const initShapeRef = useRef(initShape); // storing value only once

  // keep latest reference
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const info = useContext(PhysicsContext);
  if (!info) {
    throw new Error('expecting b2.World');
  }

  // for per-frame state debounce
  const lastActiveRef = useRef(false);

  // initialize the physics object
  const init = (referenceObject: THREE.Object3D) => {
    const { world, bodyListeners, bodyPostUpdaters } = info;

    const bodyDef = new b2.BodyDef();
    const fixDef = new b2.FixtureDef();

    // @todo also deal with body rotation
    referenceObject.updateWorldMatrix(true, false); // @todo avoid if already updated?
    tmpVector.set(0, 0, 0).applyMatrix4(referenceObject.matrixWorld);

    bodyDef.type = b2.staticBody;
    bodyDef.position.x = tmpVector.x;
    bodyDef.position.y = tmpVector.y;

    fixDef.density = 300.0;
    fixDef.friction = 0.8;
    fixDef.restitution = 0.0;
    fixDef.isSensor = true;
    fixDef.filter.categoryBits = FPS_CATEGORY_BIT; // only this category
    fixDef.filter.maskBits = FPS_CATEGORY_BIT;

    // get set of shapes for this body
    const shapes: b2.Shape[] = [];
    const customShapes = initShapeRef.current();
    if (Array.isArray(customShapes)) {
      shapes.push(...customShapes);
    } else {
      shapes.push(customShapes);
    }

    // initialize the actual body object
    const body = world.CreateBody(bodyDef);
    shapes.forEach(shape => {
      fixDef.shape = shape;
      const fix = body.CreateFixture(fixDef);
    });

    // per-frame control
    const updater = () => {
      let hasContact = false;
      for (
        let contact = body.GetContactList();
        contact;
        contact = contact!.next
      ) {
        // const bodyA = contact.contact.GetFixtureA().GetBody();
        // const otherBody = bodyA === body ? contact.contact.GetFixtureB().GetBody() : bodyA;
        hasContact = true;
        break;
      }

      // debounce state and notify
      if (lastActiveRef.current !== hasContact) {
        lastActiveRef.current = hasContact;
        onChangeRef.current(hasContact);
      }
    };
    bodyPostUpdaters.push(updater);

    // clean up
    return () => {
      world.DestroyBody(body);

      const updaterIndex = bodyPostUpdaters.indexOf(updater);
      if (updaterIndex === -1) {
        console.error('post-updater disappeared?');
      } else {
        bodyPostUpdaters.splice(updaterIndex, 1);
      }
    };
  };

  return <ThreeDummy init={init} />;
};
