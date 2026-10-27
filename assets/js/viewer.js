/**
 * Visor 3D del brazalete (STL) construido con Three.js.
 * Todo se carga desde el propio repositorio: no hay CDN ni servidor.
 */

import * as THREE from 'three';
import { STLLoader } from '../vendor/three/STLLoader.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const MODEL_URL = './assets/models/brazalete.stl';

const stage = document.getElementById('viewerStage');
const canvas = document.getElementById('braceletCanvas');
const loaderEl = document.getElementById('viewerLoader');
const progressEl = document.getElementById('viewerProgress');
const fallbackEl = document.getElementById('viewerFallback');

const btnRotate = document.getElementById('btnRotate');
const btnWireframe = document.getElementById('btnWireframe');
const btnReset = document.getElementById('btnReset');

const reduceMotion = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false, addEventListener: () => {} };

function showFallback() {
  if (loaderEl) loaderEl.classList.add('is-hidden');
  if (fallbackEl) fallbackEl.hidden = false;
}

function supportsWebGL() {
  try {
    const test = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (test.getContext('webgl2') || test.getContext('webgl') || test.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

if (!stage || !canvas || !supportsWebGL()) {
  showFallback();
} else {
  try {
    initViewer();
  } catch (error) {
    console.error('No se pudo iniciar el visor 3D:', error);
    showFallback();
  }
}

function initViewer() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  camera.position.set(0, 0.6, 3);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.85;
  controls.minDistance = 0.4;
  controls.maxDistance = 20;
  controls.autoRotate = !reduceMotion.matches;
  controls.autoRotateSpeed = 1.1;
  controls.enablePan = false;

  // Iluminación -------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xdff3ef, 0x0a2321, 1.15);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2.4, 3.2, 2.8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9fe0d5, 1.1);
  fill.position.set(-3, -1.4, 1.4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xf7d9bd, 1.4);
  rim.position.set(-1.2, 2.2, -3);
  scene.add(rim);

  // Malla -------------------------------------------------------
  const material = new THREE.MeshStandardMaterial({
    color: 0x9fc3bc,
    metalness: 0.42,
    roughness: 0.38,
    flatShading: false,
  });

  let mesh = null;
  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  let maxDim = 1;
  let userInteracted = false;
  controls.addEventListener('start', () => { userInteracted = true; });

  /** Centra el modelo en el origen y encuadra la cámara para el tamaño actual del lienzo. */
  function frameModel(object3d, recenter = false) {
    const box = new THREE.Box3().setFromObject(object3d);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    if (recenter) object3d.position.sub(center);

    maxDim = Math.max(size.x, size.y, size.z) || 1;
    fitView();
  }

  /** Ajusta la distancia de la cámara al tamaño visible sin tocar la orientación elegida. */
  function fitView() {
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitHeight = maxDim / (2 * Math.tan(fov / 2));
    const fitWidth = fitHeight / Math.max(camera.aspect, 0.35);
    const distance = Math.max(fitHeight, fitWidth) * 1.45;

    camera.near = Math.max(distance / 200, 0.001);
    camera.far = distance * 40;
    camera.updateProjectionMatrix();

    const direction = new THREE.Vector3(0.3, 0.42, 0.86).normalize();
    camera.position.copy(direction.multiplyScalar(distance));

    controls.target.set(0, 0, 0);
    controls.minDistance = maxDim * 0.3;
    controls.maxDistance = maxDim * 5;
    controls.update();
  }

  const loader = new STLLoader();
  loader.load(
    MODEL_URL,
    (geometry) => {
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = false;
      modelGroup.add(mesh);

      sizeRenderer();
      frameModel(modelGroup, true);
      renderer.render(scene, camera);

      if (loaderEl) loaderEl.classList.add('is-hidden');
    },
    (event) => {
      if (!progressEl) return;
      if (event && event.total > 0) {
        const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
        progressEl.textContent = `${pct} %`;
      } else if (event && event.loaded) {
        progressEl.textContent = `${Math.round(event.loaded / 1024 / 1024)} MB`;
      }
    },
    () => {
      showFallback();
    }
  );

  // Resize ------------------------------------------------------
  function sizeRenderer() {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(Math.round(rect.width), 1);
    const height = Math.max(Math.round(rect.height), 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function handleResize() {
    sizeRenderer();
    // Reencuadra solo si la persona todavía no ha movido la cámara.
    if (!userInteracted) fitView();
    renderer.render(scene, camera);
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(handleResize).observe(stage);
  } else {
    window.addEventListener('resize', handleResize);
  }

  // Animación ---------------------------------------------------
  let visible = true;
  try {
    new IntersectionObserver(
      (entries) => entries.forEach((entry) => { visible = entry.isIntersecting; }),
      { threshold: 0.05 }
    ).observe(stage);
  } catch {
    /* IntersectionObserver opcional */
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Controles ---------------------------------------------------
  function syncRotateButton() {
    btnRotate.setAttribute('aria-pressed', String(controls.autoRotate));
  }
  syncRotateButton();

  btnRotate?.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    syncRotateButton();
  });

  reduceMotion.addEventListener?.('change', (event) => {
    if (event.matches) controls.autoRotate = false;
    syncRotateButton();
  });

  btnWireframe?.addEventListener('click', () => {
    material.wireframe = !material.wireframe;
    btnWireframe.setAttribute('aria-pressed', String(material.wireframe));
  });

  btnReset?.addEventListener('click', () => {
    if (!mesh) return;
    userInteracted = false;
    frameModel(modelGroup, true);
  });

  // Pausa la rotación al pasar el puntero por encima del modelo.
  stage.addEventListener('pointerenter', () => {
    if (controls.autoRotate) {
      controls.autoRotate = false;
      stage.dataset.autoRotatePaused = 'true';
    }
  });
  stage.addEventListener('pointerleave', () => {
    if (stage.dataset.autoRotatePaused === 'true' && btnRotate?.getAttribute('aria-pressed') === 'true') {
      controls.autoRotate = true;
    }
    delete stage.dataset.autoRotatePaused;
  });
}
