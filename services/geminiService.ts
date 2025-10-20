
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    relevancyScore: {
      type: Type.INTEGER,
      description: "A relevancy score from 0 to 100 representing how well the resume matches the job description.",
    },
    recommendation: {
      type: Type.STRING,
      description: "A clear hiring recommendation. Must be one of: 'HIRE', 'CONSIDER', or 'DO NOT HIRE'.",
    },
    summary: {
        type: Type.STRING,
        description: "A brief one-paragraph summary of the candidate's fit for the role."
    },
    pros: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of key strengths and qualifications of the candidate that align with the job description.",
    },
    cons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of potential weaknesses, red flags, or areas where the resume is lacking.",
    },
    finalVerdict: {
        type: Type.STRING,
        description: "A final, concluding statement on the candidate's suitability, explaining the reasoning behind the recommendation."
    }
  },
  required: ["relevancyScore", "recommendation", "summary", "pros", "cons", "finalVerdict"],
};

export async function analyzeResume(resume: string, jobDescription: string): Promise<AnalysisResult> {
  const prompt = `
    Analyze the following resume against the provided job description. Based on your analysis, provide a detailed comparison and a hiring recommendation.

    **Job Description:**
    ---
    ${jobDescription}
    ---

    **Candidate's Resume:**
    ---
    ${resume}
    ---

    Please provide your analysis in the specified JSON format. The relevancy score should be a number between 0 and 100. The recommendation must be one of the three specified options. The pros and cons should be concise bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text.trim();
    const parsedResult = JSON.parse(jsonText);
    
    // Basic validation to ensure the response shape matches our type
    if (
        typeof parsedResult.relevancyScore !== 'number' ||
        !['HIRE', 'CONSIDER', 'DO NOT HIRE'].includes(parsedResult.recommendation) ||
        typeof parsedResult.summary !== 'string' ||
        !Array.isArray(parsedResult.pros) ||
        !Array.isArray(parsedResult.cons) ||
        typeof parsedResult.finalVerdict !== 'string'
    ) {
        throw new Error('Received malformed data from API.');
    }

    return parsedResult as AnalysisResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get analysis from AI. Please check the console for more details.");
  }
}
