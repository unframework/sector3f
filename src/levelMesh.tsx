import React, { useState } from 'react';
import { booleans, primitives, geometries } from '@jscad/modeling';
import { Polygon } from 'three-csg-ts/lib/esm/Polygon'; // @todo fix exports upstream
import { Vertex } from 'three-csg-ts/lib/esm/Vertex'; // @todo fix exports upstream
import { useLoader, useFrame } from '@react-three/fiber';
import { Lightmap } from '@react-three/lightmap';
import * as THREE from 'three';
import * as b2 from '@flyover/box2d';

import { Body, useZQueryProvider, ZQuery } from './physics';
import { CSGRoot, CSGRootProps } from './csg';
import { applyUVProjection } from './uvProjection';
import { ThreeDummy } from './scene';
import { DebugOverlayWidgets } from './lmDebug';

// texture from https://opengameart.org/content/metalstone-textures by Spiney
// import concreteTextureUrl from './ft_conc01_c.png';
const concreteTextureUrl = '/assets/kenney/concreteSmooth.png';

// texture from https://opengameart.org/content/50-2k-metal-textures by rubberduck
// import panelTextureUrl from './level/panels.png';
const panelTextureUrl = '/assets/kenney/wall_metal.png';

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
        isWorldRelative // avoid applying local transform to the above world-coord-based polygons
        initShape={() => shape}
      />
    );
  };

  return [<Floor />, queryWorld];
}

export const WorldUV: React.FC<{ scale?: number }> = ({ scale, children }) => {
  return (
    <ThreeDummy
      init={obj => {
        if (obj instanceof THREE.Mesh) {
          const geom = obj.geometry;
          if (geom instanceof THREE.BufferGeometry) {
            // @todo check if needs update?
            obj.updateWorldMatrix(true, false);

            applyUVProjection(geom, obj.matrixWorld, scale || 1);
          }
        }
      }}
    />
  );
};

export const LevelMesh: React.FC = ({ children }) => {
  // textures for named CSG materials
  const concreteTexture = useLoader(THREE.TextureLoader, concreteTextureUrl);
  concreteTexture.wrapS = THREE.RepeatWrapping;
  concreteTexture.wrapT = THREE.RepeatWrapping;
  concreteTexture.repeat.x = 0.5;
  concreteTexture.repeat.y = 0.5;
  concreteTexture.magFilter = THREE.NearestFilter;

  const panelTexture = useLoader(THREE.TextureLoader, panelTextureUrl);
  panelTexture.wrapS = THREE.RepeatWrapping;
  panelTexture.wrapT = THREE.RepeatWrapping;
  panelTexture.repeat.x = 0.5;
  panelTexture.repeat.y = 0.5;
  panelTexture.magFilter = THREE.NearestFilter;

  const [floorBody, setFloorBody] = useState<React.ReactElement | null>(null);
  const [zQuery, setZQuery] = useState<ZQuery | null>(null);
  const [lightmapActive, setLightmapActive] = useState(false);

  useZQueryProvider(zQuery);

  return (
    <Lightmap
      disabled={!lightmapActive}
      texelsPerUnit={1}
      samplerSettings={{ targetSize: 32 }}
      workPerFrame={1}
    >
      {/*<DebugOverlayWidgets />*/}

      <CSGRoot
        // named CSG materials used across the board
        // (centrally defined here to help consistency across sub-components)
        materials={{
          default: <meshStandardMaterial map={concreteTexture} />,
          floorLight: (
            <meshStandardMaterial
              color="#f0f8ff"
              emissive={new THREE.Color('#f0f8ff')}
            />
          ),
          elevator: <meshStandardMaterial color="#a0a0a0" map={panelTexture} />,
          elevatorCeiling: <meshStandardMaterial color="#404040" />,
          elevatorTrim: <meshStandardMaterial color="#202020" />
        }}
        onReady={(csg, materialMap) => {
          const matIndexes = ['default', 'elevatorTrim', 'floorLight'].map(
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
