import { GoogleGenerativeAI } from "@google/generative-ai";

export type PatientAssistantInput = {
  userMessage: string;
  allowMedicalRecords: boolean;
  medicalSummaryText?: string | null;
  availableDoctorsText?: string | null;
};

let cachedResolvedModel: string | null = null;

function normalizeModelName(name: string): string {
  return name.startsWith("models/") ? name.slice("models/".length) : name;
}

async function listModelsViaRest(apiKey: string): Promise<any[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
    apiKey
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Failed to list Gemini models (${res.status} ${res.statusText}). ${body}`
    );
  }

  const json = (await res.json().catch(() => ({}))) as any;
  return Array.isArray(json?.models) ? json.models : [];
}

function extractModelNamesFromModelsList(models: any[]): string[] {
  const supportsGenerate = (m: any) =>
    Array.isArray(m?.supportedGenerationMethods)
      ? m.supportedGenerationMethods.includes("generateContent")
      : true;

  const names = models
    .filter((m: any) => supportsGenerate(m))
    .map((m: any) => (typeof m?.name === "string" ? m.name : ""))
    .filter(Boolean)
    .map(normalizeModelName);

  const preferredOrder = [
    // Newer/typical model ids first
    "gemini-2.0-flash",
    "gemini-2.0-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];

  const preferred: string[] = [];
  for (const key of preferredOrder) {
    const hit = names.find((n: string) => n.includes(key));
    if (hit && !preferred.includes(hit)) preferred.push(hit);
  }

  // Append the rest (unique).
  const uniqAll = [...preferred, ...names].filter(
    (n, idx, arr) => arr.indexOf(n) === idx
  );

  return uniqAll;
}

async function resolveModelName(genAI: any): Promise<string> {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (configured) return configured;
  if (cachedResolvedModel) return cachedResolvedModel;

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      cachedResolvedModel = "gemini-1.5-flash";
      return cachedResolvedModel;
    }

    const models = await listModelsViaRest(apiKey);
    const candidates = extractModelNamesFromModelsList(models);
    cachedResolvedModel =
      candidates.find((n) => n.includes("gemini-2.0-flash")) ||
      candidates.find((n) => n.includes("gemini-1.5-flash")) ||
      candidates.find((n) => n.includes("gemini-1.5-pro")) ||
      candidates[0] ||
      "gemini-1.5-flash";
    return cachedResolvedModel;
  } catch {
    // If model listing fails, try the most common v1beta model id.
    cachedResolvedModel = "gemini-1.5-flash";
    return cachedResolvedModel;
  }
}

function isModelNotFoundError(err: any): boolean {
  const msg = String(err?.message || "");
  return (
    err?.status === 404 ||
    (msg.includes("models/") && msg.includes("not found")) ||
    msg.includes("is not supported")
  );
}

export async function generatePatientAssistantReply(
  input: PatientAssistantInput
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Configure it to enable the AI assistant."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Keep this conservative and safety-oriented.
  const systemInstruction =
    "You are MediVault's AI assistant for patients. " +
    "You can provide general health tips, simple day routines, and exercise suggestions. " +
    "You can also recommend which doctor specialties to consider and suggest suitable available doctors from a provided list. " +
    "IMPORTANT: You are not a doctor. Do not diagnose. Do not provide emergency instructions. " +
    "If symptoms could be serious or the user asks for diagnosis or medication changes, advise seeing a licensed doctor. " +
    "Keep answers practical, step-by-step, and personalized only when medical context is provided. " +
    "If medical context is missing or access was not granted, explicitly say you are giving general guidance.";

  const medicalContextBlock = input.allowMedicalRecords
    ? input.medicalSummaryText?.trim()
      ? `\n\nPATIENT_MEDICAL_RECORDS_SUMMARY:\n${input.medicalSummaryText.trim()}`
      : "\n\nPATIENT_MEDICAL_RECORDS_SUMMARY: (no records found)"
    : "\n\nPATIENT_MEDICAL_RECORDS_SUMMARY: (user did not grant access)";

  const doctorsBlock = input.availableDoctorsText?.trim()
    ? `\n\nAVAILABLE_DOCTORS:\n${input.availableDoctorsText.trim()}`
    : "\n\nAVAILABLE_DOCTORS: (none provided)";

  const prompt =
    systemInstruction +
    medicalContextBlock +
    doctorsBlock +
    "\n\nUSER_REQUEST:\n" +
    input.userMessage.trim() +
    "\n\nRESPONSE_FORMAT:\n" +
    "- Start with a short summary (1-2 lines).\n" +
    "- Then provide actionable bullets.\n" +
    "- If recommending doctors, list up to 3 and explain why.\n";

  // Resolve a model that is actually available for this API key/project.
  const primaryModelName = await resolveModelName(genAI as any);

  // Try primary model first; if it is not available, fall back to other candidates.
  const tried = new Set<string>();
  const tryModel = async (modelName: string) => {
    tried.add(modelName);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return (text || "").trim() || "Sorry, I couldn't generate a response.";
  };

  try {
    return await tryModel(primaryModelName);
  } catch (err: any) {
    if (process.env.GEMINI_MODEL?.trim()) throw err;
    if (!isModelNotFoundError(err)) throw err;

    // Reset cache and retry using model list candidates.
    cachedResolvedModel = null;
    let fallbackCandidates: string[] = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];

    try {
      const models = await listModelsViaRest(apiKey);
      const discovered = extractModelNamesFromModelsList(models);
      if (discovered.length) fallbackCandidates = discovered;
    } catch {
      // keep defaults
    }

    for (const name of fallbackCandidates) {
      if (tried.has(name)) continue;
      try {
        return await tryModel(name);
      } catch (e: any) {
        if (!isModelNotFoundError(e)) throw e;
      }
    }
    throw err;
  }
}
