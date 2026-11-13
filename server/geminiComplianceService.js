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
  sensitivityThreshold = 85,
  imageData = null,
  colorTokens = [],
  approvedLogoData = null
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check your backend .env file.');
  }

  const effectiveContent = (content && content.trim())
    ? content.trim()
    : (imageData ? 'Visual Creative Asset (Image submission for multimodal visual compliance inspection)' : '');

  if (!effectiveContent) {
    throw new Error('Content is empty. Please provide text or an image file to analyze.');
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

  const formattedColorTokens = Array.isArray(colorTokens) && colorTokens.length > 0
    ? colorTokens.map(c => `- ${c.name || 'Brand Color'}: ${c.hex} (${c.role || 'Brand Token'})`).join('\n')
    : 'Primary Tech Cobalt #536DFE, Slate Dark Navy #202B45, Cyan Glow #00E5FF, Neumorphic Slate #E8ECF3';

  const systemInstruction = `You are BrandGuard AI, an enterprise-grade brand governance and compliance analysis engine with advanced multimodal visual understanding.
Your task is to analyze submitted marketing, promotional, or corporate content — including visual creative assets (images, posters, advertisements, social media graphics) and written copy — against approved company brand guidelines.

EVALUATION SCOPE:
1. Copy & Claims Compliance:
   - Trademark Misuse: Incorporating protected marks into custom names (e.g. "Salesforce AI Pro"), unauthorized derivations, genericizing trademarks, or missing legal attribution notices.
   - False Partnerships & Endorsements: Unsubstantiated claims of being "officially partnered", "exclusive partner", or "preferred provider" without evidence.
   - Unsupported Promotional Claims: Absolute guarantees (e.g. "guarantees 10x ROI in 30 days"), claims of "no risk", or unbacked assertions.
   - Brand Terminology & Tone: Misspellings, incorrect casing, or unprofessional sales superlatives.

2. Visual & Creative Multimodal Audit (When an image is provided):
   - Brand Colours & HEX Codes: Inspect the actual pixels of the image. Identify the dominant colours with their exact HEX codes (#RRGGBB). Compare each detected color against the approved brand palette tokens. Flag unapproved or discordant colors under category "Color Palette".
   - Comparative Master Logo Verification (When an approved master logo is provided as IMAGE 2):
     Directly compare the logo used in the creative (IMAGE 1) against the approved master reference logo (IMAGE 2).
     Detect and flag:
     1. Unapproved or Incorrect Logo Usage: Logo absent when required, imitation mark, incorrect typography, or missing brand emblem.
     2. Logo Distortion or Altered Proportions: Squeezing, stretching, skewing, perspective distortion, or unequal horizontal/vertical scaling under category "Logo Usage".
     3. Unauthorized Colour Variations: Changing logo fills, altered gradients, non-standard tinting, or lack of contrast against background under category "Logo Usage".
     4. Incorrect Logo Versions: Using obsolete, unapproved, or unofficial versions of the logo lockup under category "Logo Usage".
     5. Placement & Clear Space Margins: Crowding the logo edges, failing to maintain unobstructed clear-space margin, or placing over busy elements under category "Logo Usage".
   - When NO approved master logo asset is provided as IMAGE 2:
     Evaluate logo placement and visible elements strictly against textual guidelines. Set logoAssessment.referenceComparison to "No Approved Master Logo on File" and referenceStatus to "Unverified (No Master Asset)". DO NOT invent visual discrepancy findings against a missing master logo.
   - Typography & Hierarchy: Evaluate font styling, readability, headline-to-body contrast, and legibility under category "Typography & Hierarchy" or "Readability".
   - Layout & Spacing: Assess balance, safe zones, clutter, margin consistency, and visual alignment under category "Layout & Spacing".
   - Visual Consistency: Ensure the overall creative aesthetic matches the organisation's approved identity standards.

OUTPUT INSTRUCTIONS:
- You must return ONLY a strictly valid JSON object matching the JSON schema below.
- Do NOT wrap in markdown code fences (\`\`\`json).
- If any violations or unverified claims are detected, the compliance score MUST NEVER BE 100%.
- New submissions with violations MUST be flagged or marked "Pending Review" — NEVER mark them "Approved".
- For every detected issue, you MUST specify:
  1. problematicText: The exact sentence, excerpt, or visual element description (e.g., "Background color #FF0033", "Top-left logo placement", or text quote).
  2. category: "Visual Identity" | "Color Palette" | "Logo Usage" | "Typography & Hierarchy" | "Layout & Spacing" | "Readability" | "Trademark Misuse" | "False Partnership / Endorsement" | "Unsupported Promotional Claims" | "Brand Terminology" | "Brand Voice and Tone".
  3. severity: "Critical" | "High" | "Medium" | "Low".
  4. explanation: Detailed explanation of why the content or visual element violates the guideline.
  5. relevantGuideline: The specific brand guideline rule or visual standard violated.
  6. suggestedCorrection: A professional, brand-compliant alternative or actionable design recommendation.
  7. verificationType: "Confirmed Violation" | "Requires Human Verification".

JSON Schema:
{
  "summary": "High-level audit overview detailing identified visual and messaging risks.",
  "status": "Flagged" | "Pending Review",
  "score": <number 0-100 calculated from findings>,
  "findings": [
    {
      "problematicText": "string",
      "category": "Visual Identity" | "Color Palette" | "Logo Usage" | "Typography & Hierarchy" | "Layout & Spacing" | "Readability" | "Trademark Misuse" | "False Partnership / Endorsement" | "Unsupported Promotional Claims" | "Brand Terminology" | "Brand Voice and Tone",
      "severity": "Critical" | "High" | "Medium" | "Low",
      "explanation": "string",
      "relevantGuideline": "string",
      "suggestedCorrection": "string",
      "verificationType": "Confirmed Violation" | "Requires Human Verification"
    }
  ],
  "visualAnalysis": {
    "isImage": boolean,
    "hasLogoReference": boolean,
    "approvedLogoName": "string",
    "detectedColors": [
      {
        "hex": "string (#RRGGBB)",
        "name": "string",
        "isApproved": boolean,
        "percentage": <number 1-100>,
        "notes": "string"
      }
    ],
    "brandPaletteComparison": {
      "approvedMatched": ["string (#RRGGBB)"],
      "unapprovedDetected": ["string (#RRGGBB)"],
      "matchRate": <number 0-100>,
      "summary": "string"
    },
    "logoAssessment": {
      "detected": boolean,
      "placement": "string",
      "compliance": "Compliant" | "Non-Compliant" | "Not Detected",
      "referenceComparison": "Exact Match" | "Minor Variation" | "Distortion Flagged" | "Color Variation Flagged" | "Unapproved Version" | "No Approved Master Logo on File",
      "referenceStatus": "Verified Match" | "Discrepancy Detected" | "Unverified (No Master Asset)",
      "approvedLogoRef": "string",
      "distortionDetected": boolean,
      "colorVariationDetected": boolean,
      "clearSpaceCompliance": "Compliant" | "Violation",
      "findings": "string",
      "notes": "string"
    },
    "typographyAssessment": {
      "style": "string",
      "readability": "High" | "Moderate" | "Low",
      "contrast": "Sufficient" | "Low Contrast",
      "notes": "string"
    },
    "layoutAssessment": {
      "balance": "Balanced" | "Unbalanced",
      "clutter": "Low" | "Medium" | "High",
      "notes": "string"
    },
    "visualScore": <number 0-100>,
    "recommendedImprovements": [
      "string (concise actionable design recommendation)"
    ]
  },
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

  let prompt = `CONTENT DETAILS:
Title: ${title || 'Untitled Asset'}
Category / Format: ${contentType || (imageData ? 'Creative Image Asset' : 'Marketing Copy')}

APPROVED BRAND GUIDELINES (${guidelines.length} Active Rules):
${formattedGuidelines || 'General Brand Safety & Trademark Governance Rules apply.'}

APPROVED BRAND COLOR PALETTE TOKENS:
${formattedColorTokens}
`;

  if (imageData) {
    prompt += `\nSUBMITTED CREATIVE ASSET (IMAGE 1):
A creative visual asset has been provided as IMAGE 1 for multimodal compliance inspection.`;
  }

  if (approvedLogoData && approvedLogoData.base64) {
    prompt += `\nAPPROVED MASTER BRAND LOGO ASSET (IMAGE 2):
An official approved master logo asset ("${approvedLogoData.name || 'Master Brand Logo'}", Variant: ${approvedLogoData.variant || 'Primary Master'}) has been provided as IMAGE 2.
Perform a direct visual comparative verification between any logo in IMAGE 1 and the approved master reference logo in IMAGE 2. Compare shape fidelity, distortion, aspect ratio, color accuracy, and clear-space margins.`;
  } else {
    prompt += `\nAPPROVED MASTER BRAND LOGO ASSET:
No approved master logo file is on record for this organisation. Note that visual logo comparison against a master asset could not be verified. Do not invent visual discrepancies against a missing master logo file.`;
  }

  prompt += `\n\nSUBMITTED COPY / EXTRACTED TEXT:
${effectiveContent}

Perform a rigorous, line-by-line and visual pixel inspection against the brand guidelines, color tokens, and approved master logo (if provided) above. Return the complete JSON analysis.`;

  let contentsPayload;
  if (imageData && imageData.base64) {
    let rawBase64 = imageData.base64;
    let mimeType = (imageData.mimeType || 'image/png').toLowerCase();
    const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1].toLowerCase() || mimeType;
      rawBase64 = match[2];
    }
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validMimes.includes(mimeType)) {
      throw new Error(`Unsupported image format "${mimeType}". Allowed formats: PNG, JPG, JPEG, WEBP.`);
    }

    contentsPayload = [
      prompt,
      {
        inlineData: {
          mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
          data: rawBase64.trim()
        }
      }
    ];

    // If approved master logo is provided, attach as IMAGE 2 in multimodal turn
    if (approvedLogoData && approvedLogoData.base64) {
      let rawLogoBase64 = approvedLogoData.base64;
      let logoMime = (approvedLogoData.mimeType || 'image/png').toLowerCase();
      const logoMatch = rawLogoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (logoMatch) {
        logoMime = logoMatch[1].toLowerCase() || logoMime;
        rawLogoBase64 = logoMatch[2];
      }
      if (logoMime === 'image/jpg') logoMime = 'image/jpeg';
      if (logoMime === 'image/svg+xml') logoMime = 'image/png'; // rasterized

      contentsPayload.push({
        inlineData: {
          mimeType: logoMime,
          data: rawLogoBase64.trim()
        }
      });
    }
  } else {
    contentsPayload = prompt;
  }

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
        contents: contentsPayload,
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

  // If visual score is provided and sufficient evidence exists, blend harmoniously
  if (parsed.visualAnalysis && typeof parsed.visualAnalysis.visualScore === 'number') {
    if (findings.length > 0) {
      computedScore = Math.min(computedScore, parsed.visualAnalysis.visualScore);
    } else {
      computedScore = parsed.visualAnalysis.visualScore;
    }
  }

  // Status must NEVER be 'Approved' upon initial analysis
  const hasCritical = findings.some(f => f.severity === 'Critical');
  const finalStatus = hasCritical ? 'Flagged' : (findings.length > 0 ? 'Pending Review' : 'Pending Review');

  let normalizedVisualAnalysis = null;
  if (parsed.visualAnalysis || imageData) {
    const rawVA = parsed.visualAnalysis || {};
    const rawLogo = rawVA.logoAssessment || {};
    const rawPalette = rawVA.brandPaletteComparison || {};
    const hasLogoRef = !!(approvedLogoData && approvedLogoData.base64);

    normalizedVisualAnalysis = {
      isImage: true,
      hasLogoReference: hasLogoRef,
      approvedLogoName: approvedLogoData?.name || (hasLogoRef ? 'Approved Master Logo' : null),
      detectedColors: (Array.isArray(rawVA.detectedColors) ? rawVA.detectedColors : []).map(c => ({
        ...c,
        isBrandApproved: c.isBrandApproved !== undefined ? c.isBrandApproved : (c.isApproved !== undefined ? c.isApproved : true)
      })),
      brandPaletteComparison: {
        ...rawPalette,
        approvedMatched: rawPalette.approvedMatched || rawPalette.matchedBrandColors || [],
        matchedBrandColors: rawPalette.matchedBrandColors || rawPalette.approvedMatched || [],
        unapprovedDetected: rawPalette.unapprovedDetected || rawPalette.unapprovedColorsDetected || [],
        unapprovedColorsDetected: rawPalette.unapprovedColorsDetected || rawPalette.unapprovedDetected || [],
        matchRate: typeof rawPalette.matchRate === 'number' ? rawPalette.matchRate : 100,
        summary: rawPalette.summary || ''
      },
      logoAssessment: {
        ...rawLogo,
        detected: rawLogo.detected !== undefined ? rawLogo.detected : true,
        placement: rawLogo.placement || 'Detected in Creative',
        compliance: rawLogo.compliance || (rawLogo.isCompliant ? 'Compliant' : 'Non-Compliant'),
        isCompliant: rawLogo.isCompliant !== undefined ? rawLogo.isCompliant : (rawLogo.compliance === 'Compliant'),
        referenceComparison: hasLogoRef
          ? (rawLogo.referenceComparison || (rawLogo.compliance === 'Compliant' ? 'Exact Match' : 'Discrepancy Detected'))
          : 'No Approved Master Logo on File',
        referenceStatus: hasLogoRef
          ? (rawLogo.referenceStatus || (rawLogo.compliance === 'Compliant' ? 'Verified Match' : 'Discrepancy Detected'))
          : 'Unverified (No Master Asset)',
        approvedLogoRef: approvedLogoData?.name || (hasLogoRef ? 'Official Master Reference' : 'None on File'),
        distortionDetected: !!rawLogo.distortionDetected,
        colorVariationDetected: !!rawLogo.colorVariationDetected,
        clearSpaceCompliance: rawLogo.clearSpaceCompliance || (rawLogo.compliance === 'Compliant' ? 'Compliant' : 'Needs Review'),
        findings: rawLogo.findings || rawLogo.notes || (hasLogoRef ? 'Logo compared against approved master asset.' : 'Logo evaluated against textual brand rules.')
      },
      typographyAssessment: {
        ...rawVA.typographyAssessment,
        contrastCompliance: rawVA.typographyAssessment?.contrastCompliance !== undefined
          ? rawVA.typographyAssessment.contrastCompliance
          : (rawVA.typographyAssessment?.contrast !== 'Low Contrast'),
        hierarchyRating: rawVA.typographyAssessment?.hierarchyRating || rawVA.typographyAssessment?.readability || 'Standard',
        fontsDetected: rawVA.typographyAssessment?.fontsDetected || (rawVA.typographyAssessment?.style ? [rawVA.typographyAssessment.style] : ['Sans-serif']),
        findings: rawVA.typographyAssessment?.findings || rawVA.typographyAssessment?.notes || ''
      },
      layoutAssessment: {
        ...rawVA.layoutAssessment,
        spacingBalance: rawVA.layoutAssessment?.spacingBalance || rawVA.layoutAssessment?.balance || 'Balanced grid',
        visualConsistency: rawVA.layoutAssessment?.visualConsistency || 'Consistent brand look',
        findings: rawVA.layoutAssessment?.findings || rawVA.layoutAssessment?.notes || ''
      },
      visualScore: typeof rawVA.visualScore === 'number' ? rawVA.visualScore : computedScore,
      recommendedImprovements: Array.isArray(rawVA.recommendedImprovements) ? rawVA.recommendedImprovements : []
    };
  }

  return {
    score: typeof parsed.score === 'number' && parsed.score <= computedScore ? parsed.score : computedScore,
    status: finalStatus,
    summary: parsed.summary || 'Compliance analysis completed.',
    findings,
    violations: findings, // alias for backwards compatibility
    checks,
    visualAnalysis: normalizedVisualAnalysis,
    modelUsed: usedModel,
    isAiVerified: true,
    analyzedAt: new Date().toISOString()
  };
}
