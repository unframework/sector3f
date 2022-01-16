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

export type AllShapeOptions =
  | ({
      type: 'cuboid';
    } & primitives.CuboidOptions)
  | ({
      type: 'cylinder';
    } & primitives.CylinderOptions);

export type ShapeProps = AllShapeOptions & {
  material?: string;
};

export const Shape: React.FC<ShapeProps> = (props, ref) => {
  const { geoms, debugScene } = useContext(GeomContext);

  const init = (obj3d: THREE.Object3D) => {
    const geom = createGeom(props);
    geom.color = (props.material === undefined ? null : props.material) as any;

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
        <mesh>
          <primitive attach="geometry" object={geom} />
          {materialList}
        </mesh>
      )}

      {children}
    </CSGContext.Provider>
  );
};

export const CSGModel: React.FC<{
  defaultMaterial?: string;
  mesh: (
    material: string,
    bufferGeometry: THREE.BufferGeometry,
    polys: geometries.poly3.Poly3[]
  ) => React.ReactElement | null;
  onReady: () => void;
  debug?: boolean;
}> = ({ defaultMaterial, mesh, onReady, debug, children }) => {
  // avoid re-triggering effect (need to read prop only first time)
  const defaultMaterialRef = useRef(defaultMaterial);
  const meshRef = useRef(mesh);
  const onReadyRef = useRef(onReady);

  const [localCtx] = useState(() => ({
    geoms: [] as geometries.geom3.Geom3[],
    debugScene: new THREE.Scene()
  }));
  const [meshContent, setMeshContent] = useState<React.ReactElement[] | null>(
    null
  );

  // perform conversion from CSG volumes to mesh
  useLayoutEffect(() => {
    // @todo use union?
    const volume = localCtx.geoms[0];
    if (!volume) {
      return; // @todo
      // throw new Error('expected CSG volume result');
    }

    const defaultMatName = defaultMaterialRef.current || 'default';
    const polyListByMatName: Record<string, geometries.poly3.Poly3[]> = {};
    for (const poly of volume.polygons) {
      const polyMatProp = (poly.color as unknown) as string | null;
      const matName = polyMatProp === null ? defaultMatName : polyMatProp;

      const polyList = (polyListByMatName[matName] =
        polyListByMatName[matName] || []);
      polyList.push(poly);
    }

    const contentNodeList: React.ReactElement[] = [];
    for (const materialName of Object.keys(polyListByMatName)) {
      const polyList = polyListByMatName[materialName];
      const bufferGeom = createBufferFromPolys(polyList);

      const contentNode = meshRef.current(materialName, bufferGeom, polyList);

      if (contentNode) {
        contentNodeList.push(
          React.cloneElement(contentNode, { key: materialName })
        );
      }
    }

    setMeshContent(contentNodeList);

    onReadyRef.current();
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
    <GeomContext.Provider value={localCtx}>
      {meshContent}

      {children}
    </GeomContext.Provider>
  );
};
