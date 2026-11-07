/**
 * BrandGuard AI - Guideline Rule Extractor Service
 * Extracts individual discrete rules from uploaded brand guideline documents
 * (PDF, DOCX, TXT) so each rule is tracked separately by category, priority, and source.
 */

export function extractDocumentRules(text, filename = 'document.txt', targetOrg = '') {
  if (!text || !text.trim()) {
    return { organisation: targetOrg || 'General Workspace', rules: [] };
  }

  // 1. Detect organisation name from header or text, or use targetOrg
  let organisation = targetOrg || 'General Workspace';
  const orgMatch = text.match(/(?:Organisation|Organization|Brand|Company):\s*([^\r\n]+)/i);
  if (orgMatch && orgMatch[1].trim()) {
    organisation = orgMatch[1].trim();
  } else if (!targetOrg && (/salesforce/i.test(filename) || /salesforce/i.test(text.slice(0, 500)))) {
    organisation = 'Salesforce';
  }

  const rules = [];

  // 2. Pattern A: Numbered / Prefixed rules like "G1 — Title\nBody", "Rule 1: Title\nBody", "1. Title: Body"
  const structuredRuleRegex = /(?:^|\n)(?:([A-Z]\d+|\bRule\s*\d+|\d+[\.\)])\s*[-—:]?\s*([^\r\n]+))\r?\n([\s\S]*?)(?=(?:\r?\n(?:[A-Z]\d+|\bRule\s*\d+|\d+[\.\)])\s*[-—:]|\r?\n[A-Z\s]{4,}:|\r?\nREVIEW EXPECTATIONS|$))/gi;

  let match;
  while ((match = structuredRuleRegex.exec(text)) !== null) {
    const code = match[1].trim();
    const titleHeader = match[2].trim();
    const body = match[3].trim();

    if (body.length > 5) {
      const { category, priority } = categorizeRule(titleHeader + ' ' + body);
      rules.push({
        id: `${code.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}-${rules.length}`,
        code: code,
        title: `${code} — ${titleHeader}`,
        category,
        priority,
        ruleText: body,
        sourceRef: `${filename} (${code})`,
        organisation
      });
    }
  }

  // 3. Pattern B: If no structured G1/Rule patterns were found, parse headings and bullet points/paragraphs
  if (rules.length === 0) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let currentTitle = '';
    let currentBuffer = [];

    lines.forEach((line) => {
      // Check if line looks like a header (short, capitalized, or ends with :)
      const isHeader = (line.length < 80 && /^[A-Z0-9\s—\-:()]{3,}$/.test(line)) ||
                       (line.endsWith(':') && line.length < 60) ||
                       /^#{1,4}\s+/.test(line);

      if (isHeader) {
        if (currentTitle && currentBuffer.length > 0) {
          const bodyText = currentBuffer.join(' ');
          const { category, priority } = categorizeRule(currentTitle + ' ' + bodyText);
          rules.push({
            id: `rule-${rules.length + 1}-${Date.now()}`,
            code: `R${rules.length + 1}`,
            title: currentTitle.replace(/^#+\s*/, ''),
            category,
            priority,
            ruleText: bodyText,
            sourceRef: `${filename} (Section ${rules.length + 1})`,
            organisation
          });
        }
        currentTitle = line.replace(/^#+\s*/, '').replace(/:$/, '');
        currentBuffer = [];
      } else {
        currentBuffer.push(line);
      }
    });

    if (currentTitle && currentBuffer.length > 0) {
      const bodyText = currentBuffer.join(' ');
      const { category, priority } = categorizeRule(currentTitle + ' ' + bodyText);
      rules.push({
        id: `rule-${rules.length + 1}-${Date.now()}`,
        code: `R${rules.length + 1}`,
        title: currentTitle,
        category,
        priority,
        ruleText: bodyText,
        sourceRef: `${filename} (Section ${rules.length + 1})`,
        organisation
      });
    }
  }

  // 4. Fallback if the document is continuous prose without headers
  if (rules.length === 0) {
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 30);
    paragraphs.forEach((p, idx) => {
      const firstLine = p.split('\n')[0].slice(0, 60);
      const { category, priority } = categorizeRule(p);
      rules.push({
        id: `rule-${idx + 1}-${Date.now()}`,
        code: `R${idx + 1}`,
        title: `Policy Directives - Excerpt ${idx + 1}`,
        category,
        priority,
        ruleText: p,
        sourceRef: `${filename} (Paragraph ${idx + 1})`,
        organisation
      });
    });
  }

  return { organisation, rules };
}

function categorizeRule(text) {
  const lower = text.toLowerCase();
  let category = 'Messaging Rules';
  let priority = 'Medium';

  if (lower.includes('trademark') || lower.includes('product name') || lower.includes('company name') || lower.includes('mark in your own')) {
    category = 'Terminology';
    priority = 'Critical';
  } else if (lower.includes('partnership') || lower.includes('endorse') || lower.includes('sponsor') || lower.includes('preferred provider') || lower.includes('affiliat')) {
    category = 'Approved Facts';
    priority = 'Critical';
  } else if (lower.includes('claim') || lower.includes('guarantee') || lower.includes('performance') || lower.includes('superlative') || lower.includes('outcome')) {
    category = 'Restricted Claims';
    priority = 'High';
  } else if (lower.includes('logo') || lower.includes('alter') || lower.includes('cloud logo') || lower.includes('design') || lower.includes('visual')) {
    category = 'Visual Identity';
    priority = 'High';
  } else if (lower.includes('spelling') || lower.includes('capitalis') || lower.includes('capitaliz')) {
    category = 'Terminology';
    priority = 'Medium';
  } else if (lower.includes('attribution') || lower.includes('legal notice') || lower.includes('notice')) {
    category = 'Approved Facts';
    priority = 'Medium';
  } else if (lower.includes('reference') || lower.includes('relationship') || lower.includes('confusion')) {
    category = 'Brand Voice and Tone';
    priority = 'High';
  } else if (lower.includes('accessib') || lower.includes('screen reader') || lower.includes('click here')) {
    category = 'Accessibility';
    priority = 'Medium';
  }

  return { category, priority };
}
