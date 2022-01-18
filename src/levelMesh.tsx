import React, { useState } from 'react';
import { booleans, primitives, geometries } from '@jscad/modeling';
import { Polygon } from 'three-csg-ts/lib/esm/Polygon'; // @todo fix exports upstream
import { Vertex } from 'three-csg-ts/lib/esm/Vertex'; // @todo fix exports upstream
import { useFrame } from '@react-three/fiber';
import { Lightmap } from '@react-three/lightmap';
import * as THREE from 'three';
import * as b2 from '@flyover/box2d';

import { Body, useZQueryProvider, ZQuery } from './physics';
import { CSGRoot, CSGRootProps } from './csg';
import { applyUVProjection } from './uvProjection';
import { ThreeDummy } from './scene';
import { DebugOverlayWidgets } from './lmDebug';

// temp math helpers
const tmpNormal = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function computeNormal(vertices: Vertex[]) {
  tmpNormal.x = vertices[0].pos.x;
  tmpNormal.y = vertices[0].pos.y;
  tmpNormal.z = vertices[0].pos.z;

  tmpA.x = vertices[1].pos.x;
  tmpA.y = vertices[1].pos.y;
  tmpA.z = vertices[1].pos.z;

  tmpB.x = vertices[2].pos.x;
  tmpB.y = vertices[2].pos.y;
  tmpB.z = vertices[2].pos.z;

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
  polys: Polygon[]
): [React.ReactElement, b2.World] {
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

    // @todo allow a bit of slope - this is cos(45deg) with extra margin
    if (tmpNormal.z < 0.701) {
      continue;
    }

    // get plane equation
    const planeOffset =
      tmpNormal.x * vertices[0].pos.x +
      tmpNormal.y * vertices[0].pos.y +
      tmpNormal.z * vertices[0].pos.z;

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
      const vert = vertices[j].pos;
      points.push([vert.x, vert.y]);
      b2Points.push(new b2.Vec2(vert.x, vert.y));
    }

    floorPolygons.push(primitives.polygon({ points }));

    // query-only world body
    queryShape.Set(b2Points);
    const queryBody = queryWorld.CreateBody(queryBodyDef);
    const queryFixture = queryBody.CreateFixture(queryFixDef);
    queryFixture.SetUserData(queryData);
  }

  // now combine everything into one to create wall chain shapes
  // @todo use a different library than JSCAD?
  const combinedGeom = booleans.union(floorPolygons);
  const outlines = geometries.geom2.toOutlines(combinedGeom);

  const shape = outlines.map(outline => {
    const points = outline.map(vert => new b2.Vec2(vert[0], vert[1]));
    points.reverse(); // invert back to subtractive mode

    const chain = new b2.ChainShape();
    chain.CreateLoop(points);
    return chain;
  });

  // return a ready-to-go component
  // @todo deference input data for better memory usage?
  const Floor: React.FC = () => {
    return (
      <Body
        isStatic // static body ensures continuous collision detection is enabled, to avoid tunnelling
        initShape={() => shape}
      />
    );
  };

  return [<Floor />, queryWorld];
}

export const WorldUV: React.FC = ({ children }) => {
  return (
    <ThreeDummy
      init={obj => {
        if (obj instanceof THREE.Mesh) {
          const geom = obj.geometry;
          if (geom instanceof THREE.BufferGeometry) {
            // @todo check if needs update?
            obj.updateWorldMatrix(true, false);

            applyUVProjection(geom, obj.matrixWorld);
          }
        }
      }}
    />
  );
};

export const LevelMesh: React.FC<{ materials: CSGRootProps['materials'] }> = ({
  materials,
  children
}) => {
  const [floorBody, setFloorBody] = useState<React.ReactElement | null>(null);
  const [zQuery, setZQuery] = useState<ZQuery | null>(null);
  const [lightmapActive, setLightmapActive] = useState(false);

  useZQueryProvider(zQuery);

  return (
    <Lightmap
      disabled={!lightmapActive}
      texelsPerUnit={1}
      bounceMultiplier={20}
      samplerSettings={{ targetSize: 32 }}
    >
      <DebugOverlayWidgets />

      <CSGRoot
        materials={materials}
        onReady={(csg, materialMap) => {
          const matIndexes = ['default', 'floorLight'].map(
            item => materialMap[item]
          );
          const polys = csg
            .toPolygons()
            .filter(item => matIndexes.includes(item.shared));

          const [floorBody, queryWorld] = createFloorFromVolume(polys);
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
      </CSGRoot>
    </Lightmap>
  );
};
