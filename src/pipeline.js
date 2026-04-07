import { MODEL_LIBRARY, resolveCatalogEntry } from "./catalog.js";
import { createGlb } from "./glb.js";
import { classifyWithOpenAI, createLearningContentWithOpenAI, summarizeWithOpenAI } from "./openai.js";

export async function buildModelForPrompt(prompt) {
  const aiMatch = await classifyWithOpenAI({ prompt }).catch(() => null);
  const entry = resolveEntry(aiMatch?.objectType || prompt);
  return createArtifact(entry, prompt, aiMatch?.educationalUse);
}

export async function detectFromImage({ imageDataUrl, prompt }) {
  const aiMatch = await classifyWithOpenAI({ imageDataUrl, prompt }).catch(() => null);
  const textFallback = prompt || "training object";
  const entry = resolveEntry(aiMatch?.objectType || textFallback);
  return createArtifact(entry, prompt || `Image-derived ${entry.objectType}`, aiMatch?.educationalUse);
}

export async function summarizeForTraining(artifact) {
  const summary = await summarizeWithOpenAI(artifact).catch(() => null);
  return summary || fallbackSummary(artifact);
}

export async function createLearningContent(artifact) {
  const generated = await createLearningContentWithOpenAI(artifact).catch(() => null);
  if (generated) {
    return generated;
  }

  return fallbackLearningContent(artifact);
}

function resolveEntry(text) {
  return MODEL_LIBRARY[text?.toLowerCase?.()] || resolveCatalogEntry(text || "");
}

function createArtifact(entry, sourcePrompt, educationalUse) {
  const mesh = entry.build();
  const glbBase64 = createGlb({
    ...mesh,
    colorHex: entry.color,
    name: entry.objectType,
  });

  return {
    objectType: entry.objectType,
    detectedFrom: sourcePrompt,
    color: entry.color,
    summarySeed: educationalUse || entry.summarySeed,
    processing: {
      format: "glb",
      material: "Single PBR material with basic roughness/metalness",
      normalized: true,
      centered: true,
    },
    modelUrl: `data:model/gltf-binary;base64,${glbBase64}`,
  };
}

function fallbackSummary(artifact) {
  return `${capitalize(artifact.objectType)}: ${artifact.summarySeed}`;
}

function fallbackLearningContent(artifact) {
  return {
    summary: fallbackSummary(artifact),
    keyUses: buildUses(artifact.objectType),
    safetyNote: buildSafetyNote(artifact.objectType),
    quizQuestion: `What is the main training purpose of this ${artifact.objectType}?`,
  };
}

function buildUses(objectType) {
  const uses = {
    "hard hat": [
      "Demonstrates required site personal protective equipment.",
      "Helps learners identify head protection zones.",
      "Supports safety induction and compliance scenarios.",
    ],
    hammer: [
      "Shows a standard striking tool used in basic site work.",
      "Supports identification drills for hand tools.",
      "Helps explain when impact tools are appropriate.",
    ],
    wrench: [
      "Demonstrates fastening and loosening of fittings.",
      "Supports maintenance and assembly training modules.",
      "Helps learners distinguish torque tools from striking tools.",
    ],
    screwdriver: [
      "Supports identification of screw-driving tools and tips.",
      "Helps explain fitting assembly and removal tasks.",
      "Demonstrates controlled hand-tool use in maintenance contexts.",
    ],
    "traffic cone": [
      "Shows temporary hazard and path-marking equipment.",
      "Supports work-zone setup demonstrations.",
      "Helps learners understand visual control measures.",
    ],
    barrel: [
      "Demonstrates storage and handling of contained materials.",
      "Supports site logistics and labeling discussions.",
      "Helps learners identify bulk storage objects.",
    ],
    crate: [
      "Shows packing and storage used for equipment handling.",
      "Supports warehouse and transport module examples.",
      "Helps learners identify safe manual handling contexts.",
    ],
  };

  return uses[objectType] || [
    "Supports object recognition inside a training scene.",
    "Provides a simple visual prop for scenario-based learning.",
    "Helps prototype interaction flows before detailed assets are added.",
  ];
}

function buildSafetyNote(objectType) {
  const notes = {
    "hard hat": "Inspect for cracks or damage before use and replace compromised protective equipment immediately.",
    hammer: "Use the correct hammer type for the task and keep hands clear of the striking zone.",
    wrench: "Match the wrench size to the fastener to reduce slippage and hand injuries.",
    screwdriver: "Use the correct tip type and avoid using screwdrivers as pry tools.",
    "traffic cone": "Place cones where they are clearly visible and do not rely on them as a substitute for full isolation controls.",
    barrel: "Verify labeling and handling requirements before moving or opening stored material containers.",
    crate: "Check weight and lifting method before moving crates to avoid manual handling injuries.",
  };

  return notes[objectType] || "Confirm correct use, handling, and placement before introducing the object into a live task.";
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
