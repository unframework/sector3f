import React, {
  useState,
  useLayoutEffect,
  useMemo,
  useContext,
  useRef
} from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { booleans, primitives, geometries, transforms } from '@jscad/modeling';

import { ThreeDummy } from './scene';

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
  indexAttr.count = faceCount * 3; // this seems to be necessary for correct display?
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

const GeomContext = React.createContext<{
  geoms: geometries.geom3.Geom3[];
  debugScene: THREE.Scene;
}>({ geoms: [], debugScene: new THREE.Scene() });

const IDENTITY_MAT4 = new THREE.Matrix4();

function createGeom(props: ShapeProps): geometries.geom3.Geom3 {
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
}

export type ShapeProps =
  | ({
      type: 'cuboid';
    } & primitives.CuboidOptions)
  | ({
      type: 'cylinder';
    } & primitives.CylinderOptions);
export const Shape: React.FC<ShapeProps> = (props, ref) => {
  const { geoms, debugScene } = useContext(GeomContext);

  const init = (obj3d: THREE.Object3D) => {
    const geom = createGeom(props);

    // get world transform
    // @todo proper logic that respects CSG root transform
    obj3d.updateWorldMatrix(true, false); // update parents as well
    const transformed = obj3d.matrixWorld.equals(IDENTITY_MAT4)
      ? geom
      : transforms.transform(obj3d.matrixWorld.toArray(), geom);

    // no cleanup needed
    geoms.push(transformed);

    // also create a debug mesh
    // @todo skip if debug not enabled
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

export const CSGModel: React.FC<{
  onReady?: (
    geom: THREE.BufferGeometry,
    volume: geometries.geom3.Geom3
  ) => void;
  debug?: boolean;
}> = ({ onReady, debug, children }) => {
  // avoid re-triggering effect
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const [localCtx] = useState(() => ({
    geoms: [] as geometries.geom3.Geom3[],
    debugScene: new THREE.Scene()
  }));
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null);

  const testTexture = useLoader(THREE.TextureLoader, testTextureUrl);
  testTexture.wrapS = THREE.RepeatWrapping;
  testTexture.wrapT = THREE.RepeatWrapping;
  // testTexture.magFilter = THREE.NearestFilter;

  // perform conversion from CSG volumes to mesh
  useLayoutEffect(() => {
    // @todo use union?
    const volume = localCtx.geoms[0];
    if (!volume) {
      throw new Error('expected CSG volume result');
    }

    const geom = createBufferFromPolys(volume.polygons);
    setGeom(geom);

    // notify in time for the next render cycle
    if (onReadyRef.current) {
      onReadyRef.current(geom, volume);
    }
  }, []);

  useFrame(({ gl, camera }) => {
    if (!debug) {
      return;
    }

    gl.autoClear = false;
    gl.render(localCtx.debugScene, camera);
    gl.autoClear = true;
  }, 10);

  return (
    <mesh geometry={geom || undefined} castShadow receiveShadow>
      <meshStandardMaterial map={testTexture} />

      <GeomContext.Provider value={localCtx}>{children}</GeomContext.Provider>
    </mesh>
  );
};
