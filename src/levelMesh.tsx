import React, { useState } from 'react';
import { booleans, primitives, geometries } from '@jscad/modeling';
import { useFrame } from '@react-three/fiber';
import { Lightmap } from '@react-three/lightmap';
import * as THREE from 'three';
import * as b2 from '@flyover/box2d';

import { Body, useZQueryProvider, ZQuery } from './physics';
import { CSGModel } from './csg';
import { applyUVProjection } from './uvProjection';

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

interface QueryFixtureData {
  nx: number;
  ny: number;
  nz: number;
  planeOffset: number;
}

function createFloorFromVolume(
  volume: geometries.geom3.Geom3
): [React.ReactElement, b2.World] {
  const polys = volume.polygons;

  // set up a world used just for querying the polygons in 2D
  // @todo plug in Z-query to the containing physics context
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

    // @todo allow a bit of slope - this is cos(45deg) with extra margin
    if (tmpNormal.z < 0.701) {
      continue;
    }

    // get plane equation
    const planeOffset =
      tmpNormal.x * vertices[0][0] +
      tmpNormal.y * vertices[0][1] +
      tmpNormal.z * vertices[0][2];

    const queryData: QueryFixtureData = {
      nx: tmpNormal.x,
      ny: tmpNormal.y,
      nz: tmpNormal.z,
      planeOffset
    };

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
    const queryFixture = queryBody.CreateFixture(queryFixDef);
    queryFixture.SetUserData(queryData);
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
  const Floor: React.FC = () => {
    useFrame(({ gl, camera }) => {
      gl.autoClear = false;
      gl.render(debugScene, camera);
      gl.autoClear = true;
    }, 20);

    return (
      <Body
        isStatic // static body ensures continuous collision detection is enabled, to avoid tunnelling
        initShape={() => shape}
      />
    );
  };

  return [<Floor />, queryWorld];
}

export const LevelMesh: React.FC = ({ children }) => {
  const [floorBody, setFloorBody] = useState<React.ReactElement | null>(null);
  const [zQuery, setZQuery] = useState<ZQuery | null>(null);
  const [lightmapActive, setLightmapActive] = useState(false);

  useZQueryProvider(zQuery);

  return (
    <Lightmap
      disabled={!lightmapActive}
      texelsPerUnit={1}
      samplerSettings={{ targetSize: 32 }}
    >
      <CSGModel
        onReady={(geometry, volume) => {
          // add our own extra UV logic
          applyUVProjection(geometry);

          const [floorBody, queryWorld] = createFloorFromVolume(volume);
          setFloorBody(floorBody);

          // box2d geometry query, avoiding dynamic allocation
          // @todo use a full-shape query and return max of resulting zOffsets
          const tmpQueryPos = new b2.Vec2();
          let qfOutput: number | null = null;
          const qfCallback = (fixture: b2.Fixture) => {
            const fixtureData = fixture.GetUserData() as
              | QueryFixtureData
              | undefined;
            if (!fixtureData) {
              throw new Error('missing level query data');
            }

            // compute point Z on plane
            const { nx, ny, nz, planeOffset } = fixtureData;
            qfOutput =
              (planeOffset - tmpQueryPos.x * nx - tmpQueryPos.y * ny) / nz;

            // keep looking
            return true;
          };

          const zQueryImpl: ZQuery = (x, y) => {
            tmpQueryPos.Set(x, y);

            qfOutput = null;
            queryWorld.QueryFixturePoint(tmpQueryPos, qfCallback);

            return qfOutput;
          };

          setZQuery(() => zQueryImpl); // wrap in another function to avoid confusing useState

          // proceed with lightmapping passes
          setLightmapActive(true);
        }}
      >
        {children}

        {floorBody}
      </CSGModel>
    </Lightmap>
  );
};
