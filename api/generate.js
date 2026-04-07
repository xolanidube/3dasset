import { generateAssetResponse } from "../src/app-service.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await generateAssetResponse(req.body || {});
    res.status(result.status).json(result.payload);
  } catch (error) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
