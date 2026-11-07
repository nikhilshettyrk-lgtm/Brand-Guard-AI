/**
 * BrandGuard AI Analysis Engine Service
 * Dispatches compliance evaluation requests to the backend Gemini AI engine.
 * Receives line-by-line inspection, discrete rule evaluations, and structured governance findings.
 */

export async function analyzeContentCompliance({
  content,
  title,
  contentType,
  guidelines = [],
  uploadedDocuments = [],
  sensitivityThreshold = 85
}) {
  if (!content || !content.trim()) {
    throw new Error('Content text is empty. Please provide text or an extractable file.');
  }

  // 1. Gather all discrete guidelines and individual extracted document rules
  const allDiscreteRules = [];

  // Add manual guidelines
  guidelines.forEach(g => {
    allDiscreteRules.push({
      source: 'Codified Guideline',
      sourceRef: g.title,
      title: g.title,
      category: g.category || 'Messaging Rules',
      priority: g.priority || 'Medium',
      rules: Array.isArray(g.rules) ? g.rules : (g.rules ? [g.rules] : []),
      description: g.description || ''
    });
  });

  // Add individual rules from uploaded documents
  uploadedDocuments.forEach(doc => {
    if (Array.isArray(doc.extractedRules) && doc.extractedRules.length > 0) {
      doc.extractedRules.forEach(r => {
        allDiscreteRules.push({
          source: 'Uploaded Document',
          sourceRef: r.sourceRef || `${doc.name} (${r.code || 'Rule'})`,
          title: r.title,
          category: r.category || 'Document Rule',
          priority: r.priority || 'High',
          rules: [r.ruleText],
          description: r.ruleText
        });
      });
    } else if (doc.extractedText) {
      // Fallback: parse rules on the fly from document text
      const parsed = parseTextIntoDiscreteRules(doc.extractedText, doc.name);
      parsed.forEach(r => {
        allDiscreteRules.push({
          source: 'Uploaded Document',
          sourceRef: r.sourceRef,
          title: r.title,
          category: r.category,
          priority: r.priority,
          rules: [r.ruleText],
          description: r.ruleText
        });
      });
    }
  });

  // If no guidelines exist at all
  if (allDiscreteRules.length === 0) {
    return {
      score: null,
      status: 'Unverified',
      summary: 'No brand guidelines or rulebooks are currently uploaded in the workspace to evaluate this content against.',
      checks: [
        {
          name: 'Guideline Availability Check',
          category: 'Workspace Configuration',
          status: 'fail',
          score: 0,
          detail: 'No brand guidelines or documents have been added in the Brand Knowledge Hub. Upload a guideline document to enable compliance analysis.'
        }
      ],
      findings: [],
      violations: [],
      passedRules: [],
      isBackendConnected: true,
      analyzedAt: new Date().toISOString()
    };
  }

  // 2. Call the backend Gemini compliance endpoint
  try {
    const response = await fetch('/api/analyze-compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content.trim(),
        title: title ? title.trim() : 'Untitled Submission',
        contentType: contentType || 'Marketing Copy',
        guidelines: allDiscreteRules,
        sensitivityThreshold
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          score: data.score,
          status: data.status,
          summary: data.summary,
          findings: data.findings || [],
          violations: data.findings || [], // alias for consistency
          checks: data.checks || [],
          modelUsed: data.modelUsed,
          isBackendConnected: true,
          analyzedAt: data.analyzedAt || new Date().toISOString()
        };
      } else {
        throw new Error(data.error || 'Gemini compliance analysis reported a failure.');
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Backend server responded with status ${response.status}`);
    }
  } catch (backendError) {
    console.error('Error connecting to backend Gemini engine:', backendError);
    throw new Error(`Compliance analysis failed: ${backendError.message}`);
  }
}

/**
 * Parses raw document text into structured rules client-side if pre-extracted rules are not yet saved.
 */
function parseTextIntoDiscreteRules(text, filename = 'Document') {
  const rules = [];
  const structuredRuleRegex = /(?:^|\n)(?:([A-Z]\d+|\bRule\s*\d+|\d+[\.\)])\s*[-—:]?\s*([^\r\n]+))\r?\n([\s\S]*?)(?=(?:\r?\n(?:[A-Z]\d+|\bRule\s*\d+|\d+[\.\)])\s*[-—:]|\r?\n[A-Z\s]{4,}:|\r?\nREVIEW EXPECTATIONS|$))/gi;

  let match;
  while ((match = structuredRuleRegex.exec(text)) !== null) {
    const code = match[1].trim();
    const titleHeader = match[2].trim();
    const body = match[3].trim();

    if (body.length > 5) {
      const lower = (titleHeader + ' ' + body).toLowerCase();
      let category = 'Messaging Rules';
      let priority = 'Medium';

      if (lower.includes('trademark') || lower.includes('product name') || lower.includes('company name')) {
        category = 'Terminology';
        priority = 'Critical';
      } else if (lower.includes('partnership') || lower.includes('endorse') || lower.includes('sponsor') || lower.includes('preferred provider')) {
        category = 'Approved Facts';
        priority = 'Critical';
      } else if (lower.includes('claim') || lower.includes('guarantee') || lower.includes('performance')) {
        category = 'Restricted Claims';
        priority = 'High';
      } else if (lower.includes('logo') || lower.includes('alter') || lower.includes('cloud logo')) {
        category = 'Visual Identity';
        priority = 'High';
      } else if (lower.includes('attribution') || lower.includes('notice')) {
        category = 'Approved Facts';
        priority = 'Medium';
      } else if (lower.includes('reference') || lower.includes('relationship')) {
        category = 'Brand Voice and Tone';
        priority = 'High';
      }

      rules.push({
        id: `${code.replace(/[^a-zA-Z0-9]/g, '')}`,
        code: code,
        title: `${code} — ${titleHeader}`,
        category,
        priority,
        ruleText: body,
        sourceRef: `${filename} (${code})`
      });
    }
  }

  // Fallback to sections if no G-prefixed rules
  if (rules.length === 0) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let currentTitle = '';
    let currentBuffer = [];

    lines.forEach((line) => {
      const isHeader = (line.length < 80 && /^[A-Z0-9\s—\-:()]{3,}$/.test(line)) ||
                       (line.endsWith(':') && line.length < 60);

      if (isHeader) {
        if (currentTitle && currentBuffer.length > 0) {
          rules.push({
            id: `rule-${rules.length + 1}`,
            code: `R${rules.length + 1}`,
            title: currentTitle,
            category: 'Messaging Rules',
            priority: 'Medium',
            ruleText: currentBuffer.join(' '),
            sourceRef: `${filename} (Section ${rules.length + 1})`
          });
        }
        currentTitle = line.replace(/:$/, '');
        currentBuffer = [];
      } else {
        currentBuffer.push(line);
      }
    });

    if (currentTitle && currentBuffer.length > 0) {
      rules.push({
        id: `rule-${rules.length + 1}`,
        code: `R${rules.length + 1}`,
        title: currentTitle,
        category: 'Messaging Rules',
        priority: 'Medium',
        ruleText: currentBuffer.join(' '),
        sourceRef: `${filename} (Section ${rules.length + 1})`
      });
    }
  }

  return rules;
}
