import { buildModelForPrompt, createLearningContent, detectFromImage, summarizeForTraining } from "./pipeline.js";

export function getHealthPayload() {
  return {
    ok: true,
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
  };
}

export async function generateAssetResponse(body) {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";

  if (!prompt && !imageDataUrl) {
    return {
      status: 400,
      payload: { error: "Provide either a prompt or an image." },
    };
  }

  const artifact = imageDataUrl
    ? await detectFromImage({ imageDataUrl, prompt })
    : await buildModelForPrompt(prompt);

  const learning = await createLearningContent(artifact);
  const summary = await summarizeForTraining(artifact);

  return {
    status: 200,
    payload: {
      ...artifact,
      summary,
      learning,
    },
  };
}
