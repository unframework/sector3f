import React, { useImperativeHandle } from 'react';
import { booleans, primitives, geometries } from '@jscad/modeling';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as b2 from '@flyover/box2d';

import { Body } from './physics';

// temp math helpers
const tmpNormal = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function computeNormal(vertices: [number, number, number][]) {
  tmpNormal.fromArray(vertices[0]);
  tmpA.fromArray(vertices[1]);
  tmpB.fromArray(vertices[2]);
  tmpA.sub(tmpNormal);
  tmpB.sub(tmpNormal);
  tmpNormal.crossVectors(tmpA, tmpB);
  tmpNormal.normalize();
}

export interface FloorInstance {
  query(): void;
}

export function createFloorFromVolume(volume: geometries.geom3.Geom3) {
  const polys = volume.polygons;

  // set up a world used just for querying the polygons in 2D
  const queryWorld = new b2.World(new b2.Vec2(0, 0));
  const queryBodyDef = new b2.BodyDef();
  queryBodyDef.type = b2.staticBody;
  const queryFixDef = new b2.FixtureDef();
  queryFixDef.density = 1;
  const queryShape = new b2.PolygonShape();
  queryFixDef.shape = queryShape;

  // process all the relevant polys
  const floorPolygons: geometries.geom2.Geom2[] = [];
  for (let i = 0; i < polys.length; i += 1) {
    const poly = polys[i];
    const vertices = poly.vertices;

    // check plane normal and offset
    computeNormal(vertices);
    tmpNormal.multiplyScalar(-1); // flip the normal

    if (
      tmpNormal.x !== 0 ||
      tmpNormal.y !== 0 ||
      tmpNormal.z !== 1 ||
      vertices[0][2] !== 0
    ) {
      continue;
    }

    // collect the polygon points in 2D
    const points: [number, number][] = [];
    const b2Points: b2.Vec2[] = [];
    for (let j = 0; j < vertices.length; j += 1) {
      const vert = vertices[j];
      points.push([vert[0], vert[1]]);
      b2Points.push(new b2.Vec2(vert[0], vert[1]));
    }

    points.reverse(); // invert to make "additive", for union to work

    floorPolygons.push(primitives.polygon({ points }));

    // query-only world body
    queryShape.Set(b2Points);
    const queryBody = queryWorld.CreateBody(queryBodyDef);
    queryBody.CreateFixture(queryFixDef);
  }

  // now combine everything into one to create wall chain shapes
  const combinedGeom = booleans.union(floorPolygons);
  const outlines = geometries.geom2.toOutlines(combinedGeom);

  const shape = outlines.map(outline => {
    const points = outline.map(vert => new b2.Vec2(vert[0], vert[1]));
    points.reverse(); // invert back to subtractive mode

    const chain = new b2.ChainShape();
    chain.CreateLoop(points);
    return chain;
  });

  // debug view for querying
  const debugScene = new THREE.Scene();
  debugScene.name = 'Floor debug';

  // return a ready-to-go component
  // @todo deference input data for better memory usage?
  const Floor = React.forwardRef<FloorInstance>((_props, ref) => {
    useFrame(({ gl, camera }) => {
      gl.autoClear = false;
      gl.render(debugScene, camera);
      gl.autoClear = true;
    }, 20);

    useImperativeHandle(ref, () => ({
      query() {
        console.log('query!');
      }
    }));

    return (
      <Body
        isStatic // static body ensures continuous collision detection is enabled, to avoid tunnelling
        initShape={() => shape}
      />
    );
  });

  return <Floor />;
}
