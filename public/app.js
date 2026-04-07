import * as THREE from "/vendor/three/build/three.module.js";
import { OrbitControls } from "/vendor/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "/vendor/three/examples/jsm/loaders/GLTFLoader.js";

const form = document.getElementById("pipelineForm");
const promptEl = document.getElementById("prompt");
const imageInput = document.getElementById("imageInput");
const formError = document.getElementById("formError");
const apiStatus = document.getElementById("apiStatus");
const viewerNote = document.getElementById("viewerNote");
const summaryEl = document.getElementById("summary");
const objectTypeEl = document.getElementById("objectType");
const processingMeta = document.getElementById("processingMeta");
const keyUsesEl = document.getElementById("keyUses");
const safetyNoteEl = document.getElementById("safetyNote");
const quizQuestionEl = document.getElementById("quizQuestion");
const learningModeEl = document.getElementById("learningMode");
const downloadGlbButton = document.getElementById("downloadGlb");
const downloadJsonButton = document.getElementById("downloadJson");
const canvas = document.getElementById("viewerCanvas");
const viewerModeButtons = document.querySelectorAll("[data-viewer-mode]");

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let currentModel = null;
let currentPayload = null;
let autoSpin = true;
let viewerMode = "primary";

initializeViewer();
refreshHealth().catch(() => {
  apiStatus.textContent = "Could not reach the API.";
});

window.addEventListener("error", (event) => {
  postClientLog("window_error", {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  postClientLog("unhandled_rejection", {
    reason: String(event.reason),
  });
});

for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", () => {
    if (!scene || !camera || !controls) {
      return;
    }

    const action = button.dataset.action;
    if (action === "reset") {
      controls.target.set(0, 0, 0);
      camera.position.set(2.8, 1.8, 3.2);
      controls.update();
      if (currentModel) {
        currentModel.position.set(0, 0, 0);
        currentModel.rotation.set(0, 0, 0);
      }
      viewerNote.textContent = "Interactive viewer ready.";
    }
    if (action === "spin") {
      autoSpin = !autoSpin;
    }
    if (action === "lift" && currentModel) {
      currentModel.position.y += 0.2;
    }
  });
}

for (const button of viewerModeButtons) {
  button.addEventListener("click", async () => {
    viewerMode = button.dataset.viewerMode;
    updateViewerModeButtons();
    if (currentPayload) {
      await loadModel(currentPayload.viewerUrl || currentPayload.modelUrl, currentPayload.objectType, currentPayload.color);
    }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormError();

  const prompt = promptEl.value.trim();
  const imageFile = imageInput.files[0];
  if (!prompt && !imageFile) {
    showFormError("Enter a description or upload an image before generating.");
    await postClientLog("generate_blocked_validation", {
      reason: "missing_prompt_and_image",
    });
    return;
  }

  setLoadingState(true);
  await postClientLog("generate_clicked", {
    prompt,
    hasImage: Boolean(imageFile),
  });

  try {
    const payload = {
      prompt,
      imageDataUrl: await fileToDataUrl(imageFile),
    };

    await postClientLog("generate_request_started", {
      prompt: payload.prompt,
      hasImage: Boolean(payload.imageDataUrl),
    });

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    await postClientLog("generate_response_received", {
      ok: response.ok,
      status: response.status,
      objectType: data.objectType || null,
      error: data.error || null,
    });

    if (!response.ok) {
      throw new Error(data.error || "Generation failed");
    }

    currentPayload = data;
    objectTypeEl.textContent = data.objectType;
    summaryEl.textContent = data.summary;
    processingMeta.innerHTML = "";
    appendMeta(`Format: ${data.processing.format}`);
    appendMeta(data.processing.material);
    appendMeta(data.processing.normalized ? "Auto-scaled" : "Raw scale");
    appendMeta(data.processing.centered ? "Centered" : "Uncentered");
    renderLearningContent(data.learning);
    downloadGlbButton.disabled = false;
    downloadJsonButton.disabled = false;
    await loadModel(data.viewerUrl || data.modelUrl, data.objectType, data.color);
    await postClientLog("generate_completed", {
      objectType: data.objectType,
    });
  } catch (error) {
    currentPayload = null;
    summaryEl.textContent = error.message;
    learningModeEl.textContent = "Generation failed";
    await postClientLog("generate_failed", {
      message: error.message,
    });
  } finally {
    setLoadingState(false);
  }
});

downloadGlbButton.addEventListener("click", () => {
  if (!currentPayload?.modelUrl) {
    return;
  }

  downloadDataUrl(currentPayload.modelUrl, slugify(currentPayload.objectType || "training-object") + ".glb");
});

downloadJsonButton.addEventListener("click", () => {
  if (!currentPayload) {
    return;
  }

  const moduleJson = {
    id: currentPayload.id,
    objectType: currentPayload.objectType,
    summary: currentPayload.summary,
    learning: currentPayload.learning,
    processing: currentPayload.processing,
    modelUrl: currentPayload.modelUrl,
    viewerUrl: currentPayload.viewerUrl,
  };

  downloadBlob(
    new Blob([JSON.stringify(moduleJson, null, 2)], { type: "application/json" }),
    slugify(currentPayload.objectType || "training-object") + "-module.json"
  );
});

function initializeViewer() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth || canvas.offsetWidth || 800, canvas.clientHeight || 480, false);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f5fa);

    camera = new THREE.PerspectiveCamera(45, getCanvasAspect(), 0.1, 100);
    camera.position.set(2.8, 1.8, 3.2);

    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controls.update();

    const hemi = new THREE.HemisphereLight(0xffffff, 0xc7d3e0, 1.15);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(3, 5, 4);
    scene.add(dir);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(4, 48),
      new THREE.MeshStandardMaterial({ color: 0xe1e6ef, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.05;
    scene.add(ground);

    animate();
    window.addEventListener("resize", handleResize);
    updateViewerModeButtons();
    viewerNote.textContent = "Three.js viewer ready.";
  } catch (error) {
    viewerNote.textContent = `Viewer initialization failed: ${error.message}`;
    for (const button of document.querySelectorAll("[data-action]")) {
      button.disabled = true;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) {
    controls.update();
  }
  if (autoSpin && currentModel) {
    currentModel.rotation.y += 0.01;
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function handleResize() {
  if (!renderer || !camera) {
    return;
  }
  camera.aspect = getCanvasAspect();
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth || canvas.offsetWidth || 800, canvas.clientHeight || 480, false);
}

async function refreshHealth() {
  const response = await fetch("/api/health");
  const data = await response.json();
  apiStatus.textContent = data.openAiConfigured
    ? "AI classification enabled via OpenAI"
    : "Heuristic mode active. Add OPENAI_API_KEY for vision + richer summaries.";
}

async function loadModel(modelUrl, objectType, colorHex) {
  if (!scene) {
    viewerNote.textContent = `Viewer unavailable. ${objectType} was still generated and can be downloaded as GLB.`;
    return;
  }

  removeCurrentModel();

  if (viewerMode === "legacy") {
    currentModel = createSemanticPreview(objectType, colorHex);
    scene.add(currentModel);
    viewerNote.textContent = `Legacy preview mode is showing a simplified ${objectType} model.`;
    await postClientLog("viewer_loaded_legacy_preview", {
      objectType,
    });
    return;
  }

  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(modelUrl);
    currentModel = gltf.scene;
    centerAndScaleObject(currentModel);
    scene.add(currentModel);
    viewerNote.textContent = `Showing generated ${objectType} asset in the primary Three.js viewer.`;
    await postClientLog("viewer_loaded_model", {
      objectType,
      childCount: currentModel.children.length,
      engine: "three",
    });
  } catch (error) {
    currentModel = createSemanticPreview(objectType, colorHex);
    scene.add(currentModel);
    viewerNote.textContent = `GLB import failed in the primary viewer, so a live preview for ${objectType} is being shown instead.`;
    await postClientLog("viewer_load_failed", {
      objectType,
      message: error.message,
      engine: "three",
    });
  }
}

function removeCurrentModel() {
  if (!currentModel) {
    return;
  }

  scene.remove(currentModel);
  currentModel.traverse?.((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        for (const material of child.material) {
          material.dispose();
        }
      } else {
        child.material.dispose();
      }
    }
  });
  currentModel = null;
}

function centerAndScaleObject(object) {
  const bounds = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  object.position.sub(center);
  const largest = Math.max(size.x, size.y, size.z) || 1;
  const scale = 1.8 / largest;
  object.scale.setScalar(scale);
}

function createSemanticPreview(objectType, colorHex) {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: colorHex || "#4e8cff",
    roughness: 0.85,
    metalness: 0.1,
  });

  const add = (mesh, y = 0) => {
    mesh.position.y = y;
    mesh.material = material;
    root.add(mesh);
    return mesh;
  };

  if (objectType === "hard hat") {
    const dome = add(new THREE.Mesh(new THREE.SphereGeometry(0.82, 32, 20), material), 0.2);
    dome.scale.y = 0.62;
    dome.scale.z = 1.08;
    const brim = add(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.11, 18, 42), material), -0.22);
    brim.scale.y = 0.22;
    brim.scale.z = 1.18;
    const visor = add(new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.08, 0.34), material), -0.1);
    visor.position.z = 0.7;
    const ridge = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.12), material), 0.5);
    ridge.position.z = -0.02;
  } else if (objectType === "hammer") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), material), -0.1);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.25, 0.3), material), 0.95);
  } else if (objectType === "wrench") {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.1), material), 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.1), material), 0.92);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.1), material), -0.92);
  } else if (objectType === "screwdriver") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.24, 0.9, 24), material), -0.55);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 16), material), 0.65);
  } else if (objectType === "traffic cone") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.72, 1.7, 32), material), -0.02);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 1.35), material), -0.92);
  } else if (objectType === "barrel") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 1.7, 32), material), 0);
  } else {
    add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), material), 0);
  }

  centerAndScaleObject(root);
  return root;
}

function appendMeta(text) {
  const chip = document.createElement("span");
  chip.textContent = text;
  processingMeta.appendChild(chip);
}

function renderLearningContent(learning) {
  learningModeEl.textContent = "Training content generated";
  keyUsesEl.innerHTML = "";
  for (const item of learning.keyUses || []) {
    const li = document.createElement("li");
    li.textContent = item;
    keyUsesEl.appendChild(li);
  }
  safetyNoteEl.textContent = learning.safetyNote || "No safety note generated.";
  quizQuestionEl.textContent = learning.quizQuestion || "No quiz prompt generated.";
}

function setLoadingState(loading) {
  form.querySelector("button[type='submit']").disabled = loading;
  form.querySelector("button[type='submit']").textContent = loading
    ? "Generating..."
    : "Generate Learning Asset";
}

function showFormError(message) {
  formError.hidden = false;
  formError.textContent = message;
}

function clearFormError() {
  formError.hidden = true;
  formError.textContent = "";
}

function fileToDataUrl(file) {
  if (!file) {
    return Promise.resolve("");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function postClientLog(event, details) {
  try {
    await fetch("/api/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        details,
        href: window.location.href,
        userAgent: navigator.userAgent,
      }),
    });
  } catch {
    // Logging should never break the user flow.
  }
}

function getCanvasAspect() {
  const width = canvas.clientWidth || canvas.offsetWidth || 800;
  const height = canvas.clientHeight || 480;
  return width / height;
}

function updateViewerModeButtons() {
  for (const button of viewerModeButtons) {
    button.classList.toggle("active", button.dataset.viewerMode === viewerMode);
  }
}
