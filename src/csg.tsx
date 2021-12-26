import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { booleans, primitives, geometries } from '@jscad/modeling';

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
    const plane = ((poly as unknown) as Record<string, unknown>)
      .plane as number[]; // @todo typing
    const firstVertexIndex = vertexIndex;

    for (let j = 0; j < vertices.length; j += 1) {
      const vert = vertices[j];
      positionAttr.setXYZ(vertexIndex, vert[0], vert[1], vert[2]);
      normalAttr.setXYZ(vertexIndex, plane[0], plane[1], plane[2]);

      if (j >= 2) {
        indexAttr.setXYZ(
          faceIndex,
          firstVertexIndex,
          vertexIndex - 1,
          vertexIndex
        );
        faceIndex += 1;
      }

      vertexIndex += 1;
    }
  }
  console.log(vertexIndex, faceIndex);

  geometry.setIndex(indexAttr);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('normal', normalAttr);

  return geometry;
}

export const CSGModel: React.FC = () => {
  const geom = useMemo(() => {
    const csg = booleans.union(
      primitives.cylinder({
        center: [0, 0, 1],
        height: 1,
        radius: 1,
        segments: 4
      }),
      primitives.cylinder({
        center: [0, 0.5, 1.5],
        height: 1,
        radius: 1,
        segments: 4
      })
    );

    const polys = csg.polygons;
    // console.log('hi', polys);
    return createBufferFromPolys(polys);
  }, []);

  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#808080" />
    </mesh>
  );
};
