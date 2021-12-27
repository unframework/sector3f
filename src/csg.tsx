import React, { useState, useLayoutEffect, useMemo, useContext } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as b2 from '@flyover/box2d';
import { booleans, primitives, geometries } from '@jscad/modeling';

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

// all the geometry normals are flipped to reflect the subtractive mode of boolean logic
// @todo rejoin the split-up polygons (with matching plane only) to avoid seams
function createBufferFromPolys(polys: geometries.poly3.Poly3[]) {
  const geometry = new THREE.BufferGeometry();

  let vertexCount = 0;
  let faceCount = 0;
  for (let i = 0; i < polys.length; i += 1) {
    vertexCount += polys[i].vertices.length;
    faceCount += polys[i].vertices.length - 2;
  }

  const indexAttr = new THREE.Uint16BufferAttribute(faceCount * 3, 3);
  indexAttr.count = faceCount * 3;
  const positionAttr = new THREE.Float32BufferAttribute(vertexCount * 3, 3);
  const normalAttr = new THREE.Float32BufferAttribute(vertexCount * 3, 3);

  let vertexIndex = 0;
  let faceIndex = 0;
  for (let i = 0; i < polys.length; i += 1) {
    const poly = polys[i];
    const vertices = poly.vertices;

    // get plane normal (not always available on polygon)
    computeNormal(vertices);
    tmpNormal.multiplyScalar(-1); // flip the normal

    const firstVertexIndex = vertexIndex;

    for (let j = 0; j < vertices.length; j += 1) {
      const vert = vertices[j];
      positionAttr.setXYZ(vertexIndex, vert[0], vert[1], vert[2]);
      normalAttr.setXYZ(vertexIndex, tmpNormal.x, tmpNormal.y, tmpNormal.z);

      if (j >= 2) {
        // use flipped normal order
        indexAttr.setXYZ(
          faceIndex,
          firstVertexIndex,
          vertexIndex,
          vertexIndex - 1
        );
        faceIndex += 1;
      }

      vertexIndex += 1;
    }
  }

  geometry.setIndex(indexAttr);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('normal', normalAttr);

  return geometry;
}

function createFloorFromPolys(polys: geometries.poly3.Poly3[]) {
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
    for (let j = 0; j < vertices.length; j += 1) {
      const vert = vertices[j];
      points.push([vert[0], vert[1]]);
    }

    points.reverse(); // invert to make "additive", for union to work

    floorPolygons.push(primitives.polygon({ points }));
  }

  // now combine everything into one
  const combinedGeom = booleans.union(floorPolygons);
  const outlines = geometries.geom2.toOutlines(combinedGeom);

  return outlines.map(outline => {
    const points = outline.map(vert => new b2.Vec2(vert[0], vert[1]));
    points.reverse(); // invert back to subtractive mode

    const chain = new b2.ChainShape();
    chain.CreateLoop(points);
    return chain;
  });
}

const GeomContext = React.createContext<{
  geoms: geometries.geom3.Geom3[];
}>({ geoms: [] });

export type ShapeProps =
  | ({
      type: 'cuboid';
    } & primitives.CuboidOptions)
  | ({
      type: 'cylinder';
    } & primitives.CylinderOptions);
export const Shape: React.FC<ShapeProps> = (props, ref) => {
  const { geoms } = useContext(GeomContext);

  const [geom] = useState(() => {
    switch (props.type) {
      case 'cuboid':
        return primitives.cuboid(props);
      case 'cylinder':
        return primitives.cylinder(props);
      default:
        throw new Error(
          'unknown shape type: ' +
            ((props as unknown) as Record<string, unknown>).type
        );
    }
  });

  // @todo check if this is auto-disposed
  const debugGeom = useMemo(() => createBufferFromPolys(geom.polygons), [geom]);

  useLayoutEffect(() => {
    // no cleanup needed
    geoms.push(geom);
  }, [geom]);

  return (
    <mesh geometry={debugGeom}>
      <meshBasicMaterial color="#ff0000" wireframe depthTest={false} />
    </mesh>
  );
};

export type OpProps = {
  type: 'union' | 'subtract' | 'intersect';
};
export const Op: React.FC<OpProps> = ({ type, children }) => {
  const { geoms } = useContext(GeomContext);

  const [localCtx] = useState(() => ({
    geoms: [] as geometries.geom3.Geom3[]
  }));
  useLayoutEffect(() => {
    switch (type) {
      case 'union':
        geoms.push(booleans.union(localCtx.geoms));
        return;
      case 'subtract':
        geoms.push(booleans.subtract(localCtx.geoms));
        return;
      case 'intersect':
        geoms.push(booleans.intersect(localCtx.geoms));
        return;
      default:
        throw new Error('unknown op type: ' + type);
    }
  }, [geoms, localCtx]);

  return (
    <GeomContext.Provider value={localCtx}>{children}</GeomContext.Provider>
  );
};

export const CSGModel: React.FC = ({ children }) => {
  const [debugScene] = useState(() => {
    const scene = new THREE.Scene();
    scene.name = 'CSG debug scene';
    return scene;
  });
  const [localCtx] = useState(() => ({
    geoms: [] as geometries.geom3.Geom3[]
  }));
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null);
  const [shape, setShape] = useState<b2.Shape[] | null>(null);

  useLayoutEffect(() => {
    // @todo use union?
    const polys = localCtx.geoms[0] ? localCtx.geoms[0].polygons : [];
    setGeom(createBufferFromPolys(polys));
    setShape(createFloorFromPolys(polys));
  }, [localCtx]);

  useFrame(({ gl, camera }) => {
    gl.autoClear = false;
    gl.render(debugScene, camera);
    gl.autoClear = true;
  }, 10);

  return (
    <>
      {geom && (
        <mesh geometry={geom} castShadow receiveShadow>
          <meshStandardMaterial color="#808080" />

          {/* static body ensures continuous collision detection is enabled, to avoid tunnelling */}
          {shape ? <Body isStatic initShape={() => shape} /> : null}
        </mesh>
      )}

      {createPortal(
        <GeomContext.Provider value={localCtx}>
          {children}
        </GeomContext.Provider>,
        debugScene
      )}
    </>
  );
};
