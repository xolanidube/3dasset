export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    console.log("[client]", JSON.stringify(req.body || {}));
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
