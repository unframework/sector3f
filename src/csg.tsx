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
import { Vertex } from 'three-csg-ts/lib/esm/Vertex';
import { Polygon } from 'three-csg-ts/lib/esm/Polygon';
import { Vector } from 'three-csg-ts/lib/esm/Vector';

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

// special heuristic CSG shape generation based on box geometry
const BOX_FACE_INDICES = [0, 1, 4, 5];
function CSG_fromBoxGeometry(
  geom: THREE.BoxBufferGeometry,
  objectIndex: number
) {
  let polys = [];
  const faceGroups = geom.groups;
  if (faceGroups.length !== 6) {
    throw new Error('expecting 6 BoxBufferGeometry face groups');
  }

  const posattr = geom.attributes.position;
  const normalattr = geom.attributes.normal;
  const uvattr = geom.attributes.uv;
  const colorattr = geom.attributes.color;

  if (!geom.index) {
    throw new Error('BoxBufferGeometry should have index attr');
  }
  const index = geom.index.array;

  if (geom.index.count !== 3 * 12) {
    throw new Error('BoxBufferGeometry should have 12 faces');
  }

  polys = [];

  for (const group of faceGroups) {
    if (group.count !== 6) {
      throw new Error('expecting 2 faces in box face group');
    }

    const vertices = new Array(4);

    for (let j = 0; j < 4; j++) {
      const vi = index[group.start + BOX_FACE_INDICES[j]];
      const vp = vi * 3;
      const vt = vi * 2;
      const x = posattr.array[vp];
      const y = posattr.array[vp + 1];
      const z = posattr.array[vp + 2];
      const nx = normalattr.array[vp];
      const ny = normalattr.array[vp + 1];
      const nz = normalattr.array[vp + 2];
      const u = uvattr?.array[vt];
      const v = uvattr?.array[vt + 1];

      vertices[j] = new Vertex(
        new Vector(x, y, z),
        new Vector(nx, ny, nz),
        new Vector(u, v, 0),
        colorattr &&
          new Vector(
            colorattr.array[vt],
            colorattr.array[vt + 1],
            colorattr.array[vt + 2]
          )
      );
    }

    polys.push(new Polygon(vertices, objectIndex));
  }
  return polys.filter(p => !isNaN(p.plane.normal.x));
}

// original CSG polygon generation from upstream
function CSG_fromGeometry(geom: THREE.BufferGeometry, objectIndex?: any) {
  let polys = [];
  const posattr = geom.attributes.position;
  const normalattr = geom.attributes.normal;
  const uvattr = geom.attributes.uv;
  const colorattr = geom.attributes.color;
  const grps = geom.groups;
  let index;

  if (geom.index) {
    index = geom.index.array;
  } else {
    index = new Array((posattr.array.length / posattr.itemSize) | 0);
    for (let i = 0; i < index.length; i++) index[i] = i;
  }

  const triCount = (index.length / 3) | 0;
  polys = new Array(triCount);

  for (let i = 0, pli = 0, l = index.length; i < l; i += 3, pli++) {
    const vertices = new Array(3);
    for (let j = 0; j < 3; j++) {
      const vi = index[i + j];
      const vp = vi * 3;
      const vt = vi * 2;
      const x = posattr.array[vp];
      const y = posattr.array[vp + 1];
      const z = posattr.array[vp + 2];
      const nx = normalattr.array[vp];
      const ny = normalattr.array[vp + 1];
      const nz = normalattr.array[vp + 2];
      const u = uvattr?.array[vt];
      const v = uvattr?.array[vt + 1];

      vertices[j] = new Vertex(
        new Vector(x, y, z),
        new Vector(nx, ny, nz),
        new Vector(u, v, 0),
        colorattr &&
          new Vector(
            colorattr.array[vt],
            colorattr.array[vt + 1],
            colorattr.array[vt + 2]
          )
      );
    }

    if (objectIndex === undefined && grps && grps.length > 0) {
      for (const grp of grps) {
        if (index[i] >= grp.start && index[i] < grp.start + grp.count) {
          polys[pli] = new Polygon(vertices, grp.materialIndex);
        }
      }
    } else {
      polys[pli] = new Polygon(vertices, objectIndex);
    }
  }
  return polys.filter(p => !isNaN(p.plane.normal.x));
}

// CSG polygon generation that defers to box-specific heuristic as needed
// @todo submit upstream?
function CSG_fromMesh(mesh: THREE.Mesh, objectIndex: number): CSG {
  const ttvv0 = new THREE.Vector3();
  const tmpm3 = new THREE.Matrix3();
  tmpm3.getNormalMatrix(mesh.matrix);

  const polys =
    mesh.geometry instanceof THREE.BoxBufferGeometry
      ? CSG_fromBoxGeometry(mesh.geometry, objectIndex)
      : CSG_fromGeometry(mesh.geometry, objectIndex);
  for (let i = 0; i < polys.length; i++) {
    const p = polys[i];
    for (let j = 0; j < p.vertices.length; j++) {
      const v = p.vertices[j];
      v.pos.copy(ttvv0.copy(v.pos.toVector3()).applyMatrix4(mesh.matrix));
      v.normal.copy(ttvv0.copy(v.normal.toVector3()).applyMatrix3(tmpm3));
    }
  }
  return CSG.fromPolygons(polys);
}

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
    const csg = CSG_fromMesh(mesh, materialIndex);
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

    // remove index to trigger lightmapper's own vertex "welding" logic @todo this in the CSG library
    // which will respect the group ranges and keep those faces separate
    setGeom(geomResult.toNonIndexed());

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
