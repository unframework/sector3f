import * as THREE from 'three';

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

const tmpNormalMat = new THREE.Matrix3();
const tmpVN = new THREE.Vector3();
const tmpUV = new THREE.Vector3();
export function applyUVProjection(
  geometry: THREE.BufferGeometry,
  xform: THREE.Matrix4,
  scale: number,
  offset: THREE.Vector3
) {
  tmpNormalMat.getNormalMatrix(xform);

  const positionAttr = geometry.getAttribute('position');
  const normalAttr = geometry.getAttribute('normal');

  if (
    !(positionAttr instanceof THREE.Float32BufferAttribute) ||
    !(normalAttr instanceof THREE.Float32BufferAttribute)
  ) {
    throw new Error('position and normal must be float32 buffer attributes');
  }

  const vertexCount = positionAttr.count;
  const uvAttr = new THREE.Float32BufferAttribute(vertexCount * 2, 2);

  for (let i = 0; i < vertexCount; i += 1) {
    tmpVN.fromArray(normalAttr.array, i * 3);
    tmpVN.applyMatrix3(tmpNormalMat);
    tmpVN.multiplyScalar(-1); // quick hack to make things consistent with previous impl
    const uvMatrix = getUVMatrix(tmpVN);

    tmpUV.fromArray(positionAttr.array, i * 3);
    tmpUV.applyMatrix4(xform);

    tmpUV.multiplyScalar(scale);
    tmpUV.sub(offset); // nudge in UV coords means opposite effect on world pos

    tmpUV.applyMatrix4(uvMatrix);
    uvAttr.setXY(i, tmpUV.x, tmpUV.y);
  }

  geometry.setAttribute('uv', uvAttr);
}
