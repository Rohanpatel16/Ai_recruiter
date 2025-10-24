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
      description: "A clear hiring recommendation. Must be one of: 'Strong Hire', 'Consider', or 'Reject'.",
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
    redFlags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "A list of identified recruitment red flags, such as significant employment gaps (over 6 months) or frequent job hopping (3+ jobs in 5 years). Return an empty array if none are found."
    },
    finalVerdict: {
        type: Type.STRING,
        description: "A final, concluding statement on the candidate's suitability, explaining the reasoning behind the recommendation."
    },
    interviewQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 3-5 tailored interview questions to ask the candidate based on the analysis, particularly focusing on their potential weaknesses or areas that need further clarification."
    }
  },
  required: ["relevancyScore", "recommendation", "summary", "pros", "cons", "redFlags", "finalVerdict", "interviewQuestions"],
};

const nameSchema = {
    type: Type.OBJECT,
    properties: {
        fullName: {
            type: Type.STRING,
            description: "The full name of the candidate as found in the resume."
        }
    },
    required: ["fullName"]
};

export async function extractCandidateName(resumeText: string): Promise<string> {
    const prompt = `From the provided resume text, extract the full name of the candidate. Respond with a JSON object containing a single key 'fullName'. For example: {"fullName": "Jane Doe"}.

    **Resume Text:**
    ---
    ${resumeText.substring(0, 2000)}
    ---
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: nameSchema,
                temperature: 0,
            }
        });
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);
        if (typeof parsedResult.fullName === 'string' && parsedResult.fullName.length > 0) {
            return parsedResult.fullName;
        }
        throw new Error('Full name not found or is invalid.');
    } catch (error) {
        console.error("Error extracting candidate name:", error);
        throw new Error("Failed to extract candidate name from resume.");
    }
}

export async function analyzeResume(resume: string, jobDescription: string): Promise<AnalysisResult> {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `
# ROLE: Senior Technical Recruiter & Analyst

You are Recruit-AI, a meticulous and objective AI Recruitment Analyst. Your primary function is to perform a rigorous, evidence-based analysis of a candidate's resume against a job description. Your goal is to be critical and realistic, preventing unqualified candidates from proceeding. You must be conservative in your scoring and base every conclusion on explicit evidence found in the resume.

# CONTEXT
- **Today's Date:** ${today}.
- Use this date as your reference point for all time-based evaluations. Employment or education dates that are in the future are a significant red flag indicating a lack of attention to detail.

# OBJECTIVE

Strictly follow the mandatory workflow below to analyze the provided resume against the job description and generate a JSON report.

---

**Job Description:**
\`\`\`
${jobDescription}
\`\`\`

---

**Candidate's Resume:**
\`\`\`
${resume}
\`\`\`

---

# MANDATORY ANALYSIS WORKFLOW

You must follow these steps in order to arrive at your conclusions:

**Step 1: Deconstruct the Job Description**
First, identify the core requirements from the job description. Categorize them into:
- **Must-Have Skills:** Essential technologies, languages, or qualifications explicitly stated as required (e.g., "5+ years of Python," "expertise in AWS," "must have a Bachelor's degree").
- **Nice-to-Have Skills:** Preferred but not essential skills (e.g., "familiarity with Docker is a plus," "experience with Agile methodologies").

**Step 2: Evidence-Based Scoring (The Rubric)**
You will now calculate the relevancy score based on a 100-point weighted system. You MUST show your internal "math" in the reasoning. If evidence is not explicitly present in the resume for a requirement, award zero points for it. Be strict.

*   **Must-Have Skills (60 points total):**
    - Identify all "Must-Have" skills from the JD.
    - For each skill, check if there is clear, undeniable evidence in the resume.
    - Calculation: \`(Number of Must-Haves Found / Total Number of Must-Haves) * 60\`

*   **Years of Experience (25 points total):**
    - Compare the required years of experience in the core competency (e.g., "8+ years in software development") with the candidate's timeline.
    - Award points proportionally. If 8 years are required and the candidate has 8+, award the full 25 points. If they have 4, award ~12 points. If they have 1, award ~3 points.

*   **Nice-to-Have Skills (15 points total):**
    - Identify all "Nice-to-Have" skills.
    - For each skill, check for evidence in the resume.
    - Calculation: \`(Number of Nice-to-Haves Found / Total Number of Nice-to-Haves) * 15\`

The **final relevancy score** is the sum of the points from these three categories.

**Step 2.5: Red Flag Identification (Critical)**
- After scoring, meticulously scan the resume's timeline for potential red flags. Your goal is to identify patterns that might indicate instability or concern.
- **Date Inaccuracies:** Check for any employment or education dates that are in the future (after today's date). This is a critical error.
- **Employment Gaps:** Look for unexplained gaps between employment periods that are longer than 6 months.
- **Frequent Job Hopping:** Flag instances of having 3 or more jobs within a 5-year period where each job lasted for less than 1.5 years.
- **Career Regression:** Note any clear steps down in title or responsibility without explanation.
- **Vague Descriptions:** Identify job descriptions that are overly generic or lack specific, measurable achievements.
- If any red flags are identified, list them clearly in the \`redFlags\` array. If none are found, return an empty array \`[]\`.

**Step 3: Synthesize and Justify**
- **Summary:** Write a brief, 2-3 sentence executive summary of your findings.
- **Strengths & Weaknesses:** Based on your rubric analysis, list the specific points of alignment (Strengths) and misalignment (Weaknesses/Gaps). Every point MUST be tied to evidence.
- **Recommendation:** Based on the final score, provide your recommendation ("Strong Hire," "Consider," or "Reject"). Use this scoring guide:
    - **85-100:** Strong Hire
    - **60-84:** Consider
    - **0-59:** Reject

**Step 4: Generate Probing Interview Questions**
- Create 3-5 interview questions that **directly target the identified 'Weaknesses / Gaps'** from Step 3. The purpose of these questions is to clarify ambiguities and assess the severity of the identified gaps.

# OUTPUT FORMAT

Provide your complete analysis in the specified JSON format. Ensure all fields are populated according to the workflow.
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
        !['Strong Hire', 'Consider', 'Reject'].includes(parsedResult.recommendation) ||
        typeof parsedResult.summary !== 'string' ||
        !Array.isArray(parsedResult.pros) ||
        !Array.isArray(parsedResult.cons) ||
        !Array.isArray(parsedResult.redFlags) ||
        typeof parsedResult.finalVerdict !== 'string' ||
        !Array.isArray(parsedResult.interviewQuestions)
    ) {
        throw new Error('Received malformed data from API.');
    }

    return parsedResult as AnalysisResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get analysis from AI. Please check the console for more details.");
  }
}