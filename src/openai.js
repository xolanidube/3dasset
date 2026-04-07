const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

export async function classifyWithOpenAI({ prompt, imageDataUrl }) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const input = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text:
            "Identify the single most likely training object in this request. " +
            "Return compact JSON with keys: objectType, colorHint, educationalUse. " +
            "Choose practical workshop or construction nouns such as hard hat, hammer, wrench, screwdriver, cone, barrel, crate.",
        },
      ],
    },
  ];

  if (prompt) {
    input[0].content.push({ type: "input_text", text: `User description: ${prompt}` });
  }

  if (imageDataUrl) {
    input[0].content.push({ type: "input_image", image_url: imageDataUrl });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "training_object",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["objectType", "colorHint", "educationalUse"],
            properties: {
              objectType: { type: "string" },
              colorHint: { type: "string" },
              educationalUse: { type: "string" },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const outputText = payload.output_text;
  return outputText ? JSON.parse(outputText) : null;
}

export async function summarizeWithOpenAI(context) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: `Write a 2 sentence training summary for a 3D module about a ${context.objectType}. Context: ${context.summarySeed}`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return payload.output_text?.trim() || null;
}

export async function createLearningContentWithOpenAI(context) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input:
        `Create compact training content for a 3D learning module about a ${context.objectType}. ` +
        `Context: ${context.summarySeed}`,
      text: {
        format: {
          type: "json_schema",
          name: "learning_content",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["summary", "keyUses", "safetyNote", "quizQuestion"],
            properties: {
              summary: { type: "string" },
              keyUses: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
              safetyNote: { type: "string" },
              quizQuestion: { type: "string" },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return payload.output_text ? JSON.parse(payload.output_text) : null;
}
