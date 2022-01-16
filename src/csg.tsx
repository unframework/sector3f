import React, {
  useState,
  useLayoutEffect,
  useMemo,
  useContext,
  useRef
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { booleans, primitives, geometries, transforms } from '@jscad/modeling';
import { CSG } from 'three-csg-ts';

import { ThreeDummy } from './scene';

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

// context for gathering shape arguments for containing operation
interface CSGInfo {
  items: CSG[];
  materialMap: Record<string, number>;
  debugScene: THREE.Scene | null;
}
const CSGContext = React.createContext<CSGInfo>({
  items: [],
  materialMap: {},
  debugScene: null
});

const identity = new THREE.Matrix4();

export const CSGContent: React.FC<{
  material?: string;
  children: React.ReactElement<'mesh'>;
}> = ({ material, children }) => {
  // read once
  const materialRef = useRef(material);

  const { items, materialMap, debugScene } = useContext(CSGContext);

  const meshRef = useRef<THREE.Mesh>(null);
  const [isCollected, setIsCollected] = useState(false);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      throw new Error('expecting mesh content');
    }

    const materialName = materialRef.current || 'default';
    const materialIndex = materialMap[materialName];
    if (materialIndex === undefined) {
      throw new Error('cannot find material: ' + materialName);
    }

    // mark for hiding later
    setIsCollected(true);

    // @todo check if needs update?
    mesh.updateWorldMatrix(true, false);

    mesh.matrix.copy(mesh.matrixWorld); // make CSG use world matrix @todo fix upstream
    const csg = CSG.fromMesh(mesh, materialIndex);
    mesh.matrix.identity(); // reset just in case

    items.push(csg);

    // also create a debug mesh
    if (debugScene) {
      const debugGeom = csg.toGeometry(identity);
      const debugMesh = new THREE.Mesh();
      debugMesh.matrixAutoUpdate = false;

      debugMesh.geometry = debugGeom;
      debugMesh.material = new THREE.MeshBasicMaterial({
        color: '#ff0000',
        wireframe: true,
        depthTest: false
      });
      debugScene.add(debugMesh);
    }
  }, []);

  // show mesh only the first time
  return isCollected ? null : React.cloneElement(children, { ref: meshRef });
};

// dummy used as fallback
const emptyCSG = CSG.fromPolygons([]);

export type CSGOpProps = {
  type: 'union' | 'subtract' | 'intersect' | 'inverse';
};
export const CSGOp: React.FC<CSGOpProps> = ({ type, children }) => {
  const { items, ...parentContext } = useContext(CSGContext);

  const [localCtx] = useState<CSGInfo>(() => ({
    ...parentContext,
    items: []
  }));
  useLayoutEffect(() => {
    switch (type) {
      case 'union':
        items.push(
          localCtx.items.reduce(
            (prev, item) => (prev ? prev.union(item) : item),
            null as CSG | null
          ) || emptyCSG
        );
        return;
      case 'subtract':
        items.push(
          localCtx.items.reduce(
            (prev, item) => (prev ? prev.subtract(item) : item),
            null as CSG | null
          ) || emptyCSG
        );
        return;
      case 'intersect':
        items.push(
          localCtx.items.reduce(
            (prev, item) => (prev ? prev.intersect(item) : item),
            null as CSG | null
          ) || emptyCSG
        );
        return;
      case 'inverse':
        // union the shapes before inverting
        items.push(
          (
            localCtx.items.reduce(
              (prev, item) => (prev ? prev.union(item) : item),
              null as CSG | null
            ) || emptyCSG
          ).inverse()
        );
        return;
      default:
        throw new Error('unknown op type: ' + type);
    }
  }, [items, localCtx]);

  return <CSGContext.Provider value={localCtx}>{children}</CSGContext.Provider>;
};

export const CSGRoot: React.FC<{
  materials: Record<string, React.ReactElement>;
  onReady: (csg: CSG, materialMap: Record<string, number>) => void;
  debug?: boolean;
}> = ({ materials, onReady, debug, children }) => {
  // read once
  const materialsRef = useRef(materials);
  const onReadyRef = useRef(onReady);

  // build map of sequential material indexes
  const materialMap = useMemo(() => {
    const result: Record<string, number> = {};
    let count = 0;

    for (const materialName of Object.keys(materialsRef.current)) {
      result[materialName] = count;
      count += 1;
    }

    return result;
  }, []);

  const materialList = useMemo(
    () =>
      Object.keys(materialsRef.current).map(mat =>
        React.cloneElement(materialsRef.current[mat], {
          key: mat,
          attach: undefined, // clear just in case
          attachArray: 'material'
        })
      ),
    []
  );

  const [localCtx] = useState<CSGInfo>(() => ({
    items: [],
    materialMap,
    debugScene: debug ? new THREE.Scene() : null
  }));

  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null);

  // collect CSG shapes
  useLayoutEffect(() => {
    // union everything that bubbles up
    const union =
      localCtx.items.reduce(
        (prev, item) => (prev ? prev.union(item) : item),
        null as CSG | null
      ) || emptyCSG;

    // flip to show interior
    const csg = union.inverse();

    // @todo use root's world matrix
    const geomResult = csg.toGeometry(identity);
    setGeom(geomResult);

    // notify downstream code
    onReadyRef.current(csg, materialMap);
  }, []);

  useFrame(({ gl, camera }) => {
    if (!localCtx.debugScene) {
      return;
    }

    gl.autoClear = false;
    gl.render(localCtx.debugScene, camera);
    gl.autoClear = true;
  }, 10);

  return (
    <CSGContext.Provider value={localCtx}>
      {geom && (
        <mesh castShadow receiveShadow>
          <primitive attach="geometry" object={geom} />
          {materialList}
        </mesh>
      )}

      {children}
    </CSGContext.Provider>
  );
};
