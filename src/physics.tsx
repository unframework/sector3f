import React, { useState, useRef, useEffect, useContext } from 'react';
import * as b2 from '@flyover/box2d';
import * as THREE from 'three';

// @todo avoid using globals
import { g_debugDraw, g_camera } from './box2dDebugDraw';

const WorldContext = React.createContext<b2.World | null>(null);

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

export const TopDownPhysics: React.FC<{ playerMovement: [number, number] }> = ({
  playerMovement,
  children
}) => {
  const [activeWorld, setActiveWorld] = useState<b2.World | null>(null);

  const currentMovementRef = useRef(playerMovement);
  currentMovementRef.current = playerMovement;

  useEffect(() => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.className = 'physicsDebug';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d')!;

    const world = new b2.World(new b2.Vec2(0, 0));
    setActiveWorld(world);

    const bodyDef = new b2.BodyDef();
    const fixDef = new b2.FixtureDef();

    bodyDef.type = b2.dynamicBody;
    bodyDef.position.x = 0;
    bodyDef.position.y = 0;
    bodyDef.linearDamping = 10;
    bodyDef.angularDamping = 10;
    bodyDef.fixedRotation = true;
    const baseBody = world.CreateBody(bodyDef);

    const baseShape = (fixDef.shape = new b2.CircleShape());
    baseShape.Set(new b2.Vec2(0, 0), 0.25);
    fixDef.density = 200.0; // this arrives at about 40kg mass
    fixDef.friction = 0.8;
    fixDef.restitution = 0.0;
    baseBody.CreateFixture(fixDef);

    g_camera.m_center.x = 0;
    g_camera.m_center.y = 0;
    g_camera.m_extent = 10;
    g_camera.m_width = canvas.width;
    g_camera.m_height = canvas.height;

    g_debugDraw.m_ctx = ctx;
    g_debugDraw.m_drawFlags = b2.DrawFlags.e_shapeBit;

    world.SetDebugDraw(g_debugDraw);

    // computation helper
    const playerImpulseTmp = new b2.Vec2(0, 0);

    const timer = createStepTimer(STEP, () => {
      // apply motion as minimum movement impulse against linear damping
      const [playerMX, playerMY] = currentMovementRef.current;

      playerImpulseTmp.Set(playerMX, playerMY);
      if (playerMX || playerMY) {
        playerImpulseTmp.Normalize();
      }

      playerImpulseTmp.SelfMul(STEP * baseBody.GetMass() * 45);
      baseBody.ApplyLinearImpulseToCenter(playerImpulseTmp);

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
    });

    return () => {
      timer.stop();
    };
  }, []);

  // avoid passing down null while initializing
  if (!activeWorld) {
    return null;
  }

  return (
    <WorldContext.Provider value={activeWorld}>
      {children}
    </WorldContext.Provider>
  );
};

export const Body: React.FC<{
  init?: (world: b2.World) => b2.Body;
}> = ({ init }) => {
  const initRef = useRef(init); // storing value only once

  const [parentObject, setParentObject] = useState<THREE.Object3D | null>(null);
  const groupRef = useRef<THREE.Object3D | null>(null);

  const world = useContext(WorldContext);
  if (!world) {
    throw new Error('expecting b2.World');
  }

  // initialize the physics object
  useEffect(() => {
    if (!groupRef.current) {
      throw new Error('must attach to ThreeJS tree');
    }

    const meshObject = groupRef.current.parent;
    if (!(meshObject instanceof THREE.Mesh)) {
      throw new Error('must attach under ThreeJS mesh');
    }

    const meshGeom = meshObject.geometry;
    if (!(meshGeom instanceof THREE.BoxBufferGeometry)) {
      throw new Error('must attach under ThreeJS mesh with BoxBufferGeometry');
    }

    console.log('attaching body to', meshObject);
    setParentObject(meshObject);

    // const body = init(world);

    const bodyDef = new b2.BodyDef();
    const fixDef = new b2.FixtureDef();

    bodyDef.type = b2.dynamicBody;
    bodyDef.position.x = meshObject.position.x;
    bodyDef.position.y = meshObject.position.y;
    bodyDef.linearDamping = 1;
    bodyDef.angularDamping = 1;
    const body = world.CreateBody(bodyDef);

    const shape = new b2.PolygonShape();
    shape.SetAsBox(meshGeom.parameters.width, meshGeom.parameters.height);
    fixDef.shape = shape;
    fixDef.density = 300.0;
    fixDef.friction = 0.8;
    fixDef.restitution = 0.0;
    body.CreateFixture(fixDef);

    // clean up
    return () => {
      world.DestroyBody(body);
    };
  }, [world]);

  // if parentObject is known, then no need to render the group anymore
  return parentObject ? null : <group ref={groupRef} />;
};
