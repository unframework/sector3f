import React, { useRef, useEffect } from 'react';
import * as b2 from '@flyover/box2d';

import { g_debugDraw, g_camera } from './box2dDebugDraw';

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

export const PhysicsMain: React.FC<{ playerMovement: [number, number] }> = ({
  playerMovement
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMovementRef = useRef(playerMovement);
  currentMovementRef.current = playerMovement;

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = container.childNodes[0] as HTMLCanvasElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    const ctx = canvas.getContext('2d')!;

    const world = new b2.World(new b2.Vec2(0, 0));

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

    bodyDef.type = b2.dynamicBody;
    bodyDef.position.x = 2;
    bodyDef.position.y = 2;
    bodyDef.linearDamping = 1;
    bodyDef.angularDamping = 1;
    bodyDef.fixedRotation = false;
    const testGreeble = world.CreateBody(bodyDef);

    const greebleShape = (fixDef.shape = new b2.PolygonShape());
    greebleShape.SetAsBox(1, 1);
    fixDef.density = 300.0;
    fixDef.friction = 0.8;
    fixDef.restitution = 0.0;
    testGreeble.CreateFixture(fixDef);

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

  return (
    <div className="physicsDebug" ref={containerRef}>
      <canvas />
    </div>
  );
};
