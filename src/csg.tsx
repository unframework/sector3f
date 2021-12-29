import React, {
  useState,
  useLayoutEffect,
  useMemo,
  useContext,
  useRef
} from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import * as b2 from '@flyover/box2d';
import { booleans, primitives, geometries, transforms } from '@jscad/modeling';

import { ThreeDummy } from './scene';
import { Body } from './physics';

// texture from https://opengameart.org/content/metalstone-textures by Spiney
import testTextureUrl from './ft_conc01_c.png';

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

const tmpUVCalc = new THREE.Matrix4();
const uvMatrices = [
  // positive direction X, Y, Z
  new THREE.Matrix4(),
  new THREE.Matrix4(),
  new THREE.Matrix4(),
  // negative direction X, Y, Z
  new THREE.Matrix4(),
  new THREE.Matrix4(),
  new THREE.Matrix4()
];

// fill positive directions
tmpUVCalc.lookAt(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(1, 0, 0)
);
uvMatrices[0].copy(tmpUVCalc);
tmpUVCalc.lookAt(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1)
);
uvMatrices[1].copy(tmpUVCalc);
tmpUVCalc.identity();
uvMatrices[2].copy(tmpUVCalc);

// fill negative directions
uvMatrices[3].copy(uvMatrices[0]);
uvMatrices[3].scale(new THREE.Vector3(1, -1, 1));
uvMatrices[4].copy(uvMatrices[1]);
uvMatrices[4].scale(new THREE.Vector3(-1, 1, 1));
uvMatrices[5].copy(uvMatrices[2]); // unchanged

function getUVMatrix(normal: THREE.Vector3): THREE.Matrix4 {
  let largestAxis = 0;
  let largestAxisAbs = 0;
  const elems = normal.toArray();
  for (let axis = 0; axis < 3; axis += 1) {
    const axisAbs = Math.abs(elems[axis]);
    if (axisAbs > largestAxisAbs) {
      largestAxis = axis;
      largestAxisAbs = axisAbs;
    }
  }

  return uvMatrices[largestAxis + (elems[largestAxis] >= 0 ? 0 : 3)];
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
  const uvAttr = new THREE.Float32BufferAttribute(vertexCount * 2, 2);

  const tmpUV = new THREE.Vector3();

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

      const uvMatrix = getUVMatrix(tmpNormal);
      tmpUV.set(vert[0], vert[1], vert[2]);
      tmpUV.multiplyScalar(0.25);
      tmpUV.applyMatrix4(uvMatrix);
      uvAttr.setXY(vertexIndex, tmpUV.x, tmpUV.y);

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
  geometry.setAttribute('uv', uvAttr);

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
  debugScene: THREE.Scene;
}>({ geoms: [], debugScene: new THREE.Scene() });

const IDENTITY_MAT4 = new THREE.Matrix4();

export type ShapeProps =
  | ({
      type: 'cuboid';
    } & primitives.CuboidOptions)
  | ({
      type: 'cylinder';
    } & primitives.CylinderOptions);
export const Shape: React.FC<ShapeProps> = (props, ref) => {
  const { geoms, debugScene } = useContext(GeomContext);

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

  const init = (obj3d: THREE.Object3D) => {
    // get world transform
    // @todo proper logic that respects CSG root transform
    obj3d.updateWorldMatrix(true, false); // update parents as well
    const transformed = obj3d.matrixWorld.equals(IDENTITY_MAT4)
      ? geom
      : transforms.transform(obj3d.matrixWorld.toArray(), geom);

    // no cleanup needed
    geoms.push(transformed);

    // also create a debug mesh
    const debugGeom = createBufferFromPolys(geom.polygons);
    const debugMesh = new THREE.Mesh();
    debugMesh.matrix.copy(obj3d.matrixWorld);
    debugMesh.matrixAutoUpdate = false;

    debugMesh.geometry = debugGeom;
    debugMesh.material = new THREE.MeshBasicMaterial({
      color: '#ff0000',
      wireframe: true,
      depthTest: false
    });
    debugScene.add(debugMesh);
  };

  return <ThreeDummy init={init} />;
};

export type OpProps = {
  type: 'union' | 'subtract' | 'intersect';
};
export const Op: React.FC<OpProps> = ({ type, children }) => {
  const { geoms, debugScene } = useContext(GeomContext);

  const [localCtx] = useState(() => ({
    geoms: [] as geometries.geom3.Geom3[],
    debugScene
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

export const CSGModel: React.FC<{ onReady?: () => void; debug?: boolean }> = ({
  onReady,
  debug,
  children
}) => {
  // avoid re-triggering effect
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const [localCtx] = useState(() => ({
    geoms: [] as geometries.geom3.Geom3[],
    debugScene: new THREE.Scene()
  }));
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null);
  const [shape, setShape] = useState<b2.Shape[] | null>(null);

  const testTexture = useLoader(THREE.TextureLoader, testTextureUrl);
  testTexture.wrapS = THREE.RepeatWrapping;
  testTexture.wrapT = THREE.RepeatWrapping;
  // testTexture.magFilter = THREE.NearestFilter;

  // perform conversion from CSG volumes to mesh
  useLayoutEffect(() => {
    // @todo use union?
    const polys = localCtx.geoms[0] ? localCtx.geoms[0].polygons : [];
    setGeom(createBufferFromPolys(polys));
    setShape(createFloorFromPolys(polys));
  }, []);

  // notify once mesh geometry is rendered out
  useLayoutEffect(() => {
    if (geom) {
      if (onReadyRef.current) {
        onReadyRef.current();
      }
    }
  }, [geom]);

  useFrame(({ gl, camera }) => {
    if (!debug) {
      return;
    }

    gl.autoClear = false;
    gl.render(localCtx.debugScene, camera);
    gl.autoClear = true;
  }, 10);

  return (
    <>
      {geom && (
        <mesh geometry={geom} castShadow receiveShadow>
          <meshStandardMaterial map={testTexture} />

          {/* static body ensures continuous collision detection is enabled, to avoid tunnelling */}
          {shape ? <Body isStatic initShape={() => shape} /> : null}
        </mesh>
      )}

      <GeomContext.Provider value={localCtx}>{children}</GeomContext.Provider>
    </>
  );
};
