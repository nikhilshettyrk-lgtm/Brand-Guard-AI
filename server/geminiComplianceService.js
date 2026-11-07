/**
 * BrandGuard AI - Gemini Compliance Analysis Service
 * Server-side evaluation engine executing real Google Gemini Generative AI requests.
 * API keys remain confidential on the server and are never exposed to the client.
 */

import { GoogleGenAI } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODEL = 'gemini-3.8-flash';

export async function analyzeComplianceWithGemini({
  content,
  title,
  contentType,
  guidelines = [],
  sensitivityThreshold = 85
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check your backend .env file.');
  }

  if (!content || !content.trim()) {
    throw new Error('Content text is empty. Please provide text to analyze.');
  }

  // Format guidelines for clear structured ingestion by Gemini
  const formattedGuidelines = guidelines.map((g, idx) => {
    const rulesList = Array.isArray(g.rules) ? g.rules.join('\n') : (g.ruleText || g.rules || g.description || '');
    return `[Guideline ${idx + 1}]
Title: ${g.title || g.name || 'Unnamed Guideline'}
Category: ${g.category || 'General Governance'}
Priority: ${g.priority || 'Medium'}
Source / Reference: ${g.sourceRef || g.source || 'Active Workspace Rulebook'}
Rule Details:
${rulesList}`;
  }).join('\n\n');

  const systemInstruction = `You are BrandGuard AI, an enterprise-grade brand governance and compliance analysis engine.
Your task is to analyze submitted marketing, promotional, or corporate content against approved company brand guidelines.

You MUST systematically evaluate the content against all applicable rules and specifically detect:
1. Trademark Misuse: Incorporating protected brand marks into product names (e.g. "Salesforce AI Pro"), unauthorized derivations, genericizing trademarks, or missing legal attribution notices (e.g. "Salesforce is a trademark of Salesforce, Inc.").
2. False Partnerships & Endorsements: Unsubstantiated claims of being "officially partnered", "endorsed", or designated as a "preferred provider" without verified written proof.
3. Unsupported Promotional Claims: Quantified performance promises (e.g. "guarantees 10x revenue growth in 30 days"), claims of "no risk", unbacked guarantees, or absolute superlatives without supplied evidence.
4. Incorrect Brand Terminology: Misspelling, incorrect casing, or improper use of official product/platform names.
5. Misleading Brand Affiliation: Co-branding or messaging that creates confusion about brand identity or falsely equates the publisher with the brand (e.g. "BrightWave is Salesforce").
6. Logo Usage Violations: Unauthorized use, alteration, or co-branding with official logos (such as cloud logos) to imply official product status.
7. Brand Tone & Messaging: Adherence to professional tone, measured claims, and governance standards.

OUTPUT INSTRUCTIONS:
- You must return ONLY a strictly valid JSON object matching the JSON schema below.
- Do NOT wrap in markdown code fences (\`\`\`json).
- If any violations or unverified claims are detected, the compliance score MUST NEVER BE 100%.
- New submissions with violations MUST be flagged or marked "Pending Review" — NEVER mark them "Approved".
- For every detected issue, you MUST specify:
  1. problematicText: The exact sentence, phrase, or excerpt from the submitted content.
  2. category: The specific issue category.
  3. severity: "Critical" | "High" | "Medium" | "Low".
  4. explanation: Detailed explanation of why the content violates the guideline.
  5. relevantGuideline: The specific brand guideline rule violated (e.g., "G4 — Do not put Salesforce marks in your own product/company identity").
  6. suggestedCorrection: A professional, brand-compliant alternative rewrite that preserves the author's intended message safely.
  7. verificationType: "Confirmed Violation" (for definite rule breaches) or "Requires Human Verification" (for factual claims requiring internal contract/evidence sign-off).

JSON Schema:
{
  "summary": "High-level audit overview detailing identified risks and compliance standing.",
  "status": "Flagged" | "Pending Review",
  "score": <number 0-100 calculated from findings>,
  "findings": [
    {
      "problematicText": "string",
      "category": "Trademark Misuse" | "False Partnership / Endorsement" | "Unsupported Promotional Claims" | "Misleading Brand Affiliation" | "Logo Usage" | "Brand Terminology" | "Brand Voice and Tone",
      "severity": "Critical" | "High" | "Medium" | "Low",
      "explanation": "string",
      "relevantGuideline": "string",
      "suggestedCorrection": "string",
      "verificationType": "Confirmed Violation" | "Requires Human Verification"
    }
  ],
  "checks": [
    {
      "name": "string",
      "category": "string",
      "status": "pass" | "fail",
      "score": <number 0-100>,
      "detail": "string"
    }
  ]
}`;

  const prompt = `CONTENT DETAILS:
Title: ${title || 'Untitled Asset'}
Category / Format: ${contentType || 'General Marketing'}

APPROVED BRAND GUIDELINES (${guidelines.length} Active Rules):
${formattedGuidelines || 'General Brand Safety & Trademark Governance Rules apply.'}

SUBMITTED CONTENT FOR COMPLIANCE AUDIT:
${content}

Perform a rigorous, line-by-line compliance inspection against the guidelines above. Return the complete JSON analysis.`;

  const ai = new GoogleGenAI({ apiKey });

  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash'
  ];

  let rawResponseText = '';
  let usedModel = candidateModels[0];
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json'
        }
      });
      rawResponseText = response.text;
      usedModel = modelName;
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[BrandGuard AI] Model ${modelName} encountered an issue (${err.message}). Attempting candidate fallback...`);
    }
  }

  if (lastError || !rawResponseText) {
    throw new Error(lastError ? lastError.message : 'All Gemini model candidates failed to return a response.');
  }

  // Parse structured JSON response
  let parsed;
  try {
    const cleanJson = rawResponseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(cleanJson);
  } catch (parseErr) {
    console.error('Failed to parse Gemini response as JSON. Raw output was:', rawResponseText);
    throw new Error('Gemini returned an invalid JSON response structure.');
  }

  const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];
  const findings = rawFindings.map(f => {
    const ref = f.guidelineReference || f.relevantGuideline || 'Brand Policy';
    return {
      ...f,
      guidelineReference: ref,
      relevantGuideline: ref
    };
  });
  const checks = Array.isArray(parsed.checks) ? parsed.checks : [];

  // Enforce Deterministic BrandGuard Scoring Rules:
  // - If violations exist, score CANNOT be 100%
  // - Never automatically approve submissions
  let computedScore = 100;
  if (findings.length > 0) {
    findings.forEach(f => {
      if (f.severity === 'Critical') computedScore -= 25;
      else if (f.severity === 'High') computedScore -= 15;
      else if (f.severity === 'Medium') computedScore -= 8;
      else computedScore -= 5;
    });
    // Never allow score above 80 if any findings exist
    computedScore = Math.max(0, Math.min(80, computedScore));
  } else {
    computedScore = 100;
  }

  // Status must NEVER be 'Approved' upon initial analysis
  const hasCritical = findings.some(f => f.severity === 'Critical');
  const finalStatus = hasCritical ? 'Flagged' : (findings.length > 0 ? 'Pending Review' : 'Pending Review');

  return {
    score: typeof parsed.score === 'number' && parsed.score <= computedScore ? parsed.score : computedScore,
    status: finalStatus,
    summary: parsed.summary || 'Compliance analysis completed.',
    findings,
    violations: findings, // alias for backwards compatibility
    checks,
    modelUsed: usedModel,
    isAiVerified: true,
    analyzedAt: new Date().toISOString()
  };
}
