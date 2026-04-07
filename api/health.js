import { getHealthPayload } from "../src/app-service.js";

export default async function handler(req, res) {
  res.status(200).json(getHealthPayload());
}
