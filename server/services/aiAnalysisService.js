
const generateAiAnalysis = async (performanceSummary) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!performanceSummary || typeof performanceSummary !== 'object') {
    throw new Error('Valid performance summary is required');
  }

  // Load the Google Gen AI SDK in a CommonJS backend.
  const { GoogleGenAI } = await import('@google/genai');

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const prompt = `
You are an educational performance analysis assistant
for the TakeExam examination platform.

Analyze only the supplied student performance data.

Rules:
- Never invent marks, scores, ranks, or statistics.
- Do not change or recalculate official exam results.
- Identify strengths and improvement areas only when
  supported by the supplied data.
- If topic information is missing, clearly say so.
- Do not treat proctoring warnings as proof of cheating.
- Give practical, encouraging study recommendations.
- Do not infer personal characteristics about a student.

Return valid JSON with these fields:
{
  "overallFeedback": "Short performance summary",
  "strongerAreas": [
    {
      "name": "Topic or difficulty",
      "reason": "Evidence from the supplied data"
    }
  ],
  "weakerAreas": [
    {
      "name": "Topic or difficulty",
      "reason": "Evidence from the supplied data"
    }
  ],
  "studyPlan": [
    "Specific revision recommendation"
  ],
  "dataLimitations": [
    "Any missing information that limits the analysis"
  ]
}

Performance data:
${JSON.stringify(performanceSummary)}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  if (!response.text) {
    throw new Error('AI returned an empty response');
  }

  const analysis = JSON.parse(response.text);

  return analysis;
};

module.exports = generateAiAnalysis;
