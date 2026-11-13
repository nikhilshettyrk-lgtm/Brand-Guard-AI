import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getDefaultLogoAssets } from '../utils/logoAssetHelper';

const BrandGuardContext = createContext(null);

const STORAGE_KEY = 'brandguard_app_data_v2';

export const defaultOrgs = ['BrightWave Analytics', 'Northstar Digital'];

export const defaultTeamMembers = [
  { id: 'tm-1', name: 'Sarah Chen', role: 'Lead Brand Reviewer', roleType: 'Reviewer' },
  { id: 'tm-2', name: 'Alex Rivera', role: 'Compliance Manager', roleType: 'Manager' },
  { id: 'tm-3', name: 'Maya Patel', role: 'Creative Content Lead', roleType: 'Creator' },
  { id: 'tm-4', name: 'Workspace Administrator', role: 'Enterprise Administrator', roleType: 'Manager' }
];

export function matchesOrganisation(itemOrg, targetOrg) {
  if (!targetOrg) return true;
  if (!itemOrg) return false;
  const a = itemOrg.toLowerCase().trim();
  const b = targetOrg.toLowerCase().trim();
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

export function BrandGuardProvider({ children }) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          uploadedDocuments: Array.isArray(parsed.uploadedDocuments) ? parsed.uploadedDocuments : [],
          manualGuidelines: Array.isArray(parsed.manualGuidelines) ? parsed.manualGuidelines : [],
          reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          colorTokens: Array.isArray(parsed.colorTokens) ? parsed.colorTokens : [],
          logoAssets: Array.isArray(parsed.logoAssets) && parsed.logoAssets.length > 0
            ? parsed.logoAssets
            : getDefaultLogoAssets(),
          organisations: Array.isArray(parsed.organisations) && parsed.organisations.length > 0
            ? Array.from(new Set([...defaultOrgs, ...parsed.organisations]))
            : defaultOrgs,
          currentUserRole: parsed.currentUserRole || 'Manager',
          settings: {
            sensitivity: 85,
            autoApprove: false,
            notifySlack: false,
            notifyEmail: false,
            slackChannel: '',
            adminEmail: '',
            integrations: {
              slack: { enabled: false, webhookUrl: '', channel: '#brand-governance' },
              email: { enabled: false, address: '' },
              wordpress: { enabled: true, endpoint: 'https://cms.enterprise.internal/wp-json/wp/v2/posts', status: 'Connected' },
              hubspot: { enabled: true, portalId: '984321', status: 'Connected' },
              linkedin: { enabled: true, account: 'Company Global Page', status: 'Connected' },
              twitter: { enabled: true, handle: '@BrandGlobal', status: 'Connected' }
            },
            ...(parsed.settings || {})
          },
          selectedOrganisation: parsed.selectedOrganisation || defaultOrgs[0]
        };
      }
    } catch (e) {
      console.error('Error reading saved data from localStorage', e);
    }
    return {
      uploadedDocuments: [],
      manualGuidelines: [],
      reviews: [],
      activities: [],
      notifications: [],
      colorTokens: [],
      logoAssets: getDefaultLogoAssets(),
      organisations: defaultOrgs,
      currentUserRole: 'Manager',
      settings: {
        sensitivity: 85,
        autoApprove: false,
        notifySlack: false,
        notifyEmail: false,
        slackChannel: '',
        adminEmail: '',
        integrations: {
          slack: { enabled: false, webhookUrl: '', channel: '#brand-governance' },
          email: { enabled: false, address: '' },
          wordpress: { enabled: true, endpoint: 'https://cms.enterprise.internal/wp-json/wp/v2/posts', status: 'Connected' },
          hubspot: { enabled: true, portalId: '984321', status: 'Connected' },
          linkedin: { enabled: true, account: 'Company Global Page', status: 'Connected' },
          twitter: { enabled: true, handle: '@BrandGlobal', status: 'Connected' }
        }
      },
      selectedOrganisation: defaultOrgs[0]
    };
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving data to localStorage', e);
    }
  }, [data]);

  // Combined guidelines array exposing every discrete manual and document-extracted rule
  const allGuidelines = useMemo(() => {
    const manualMapped = data.manualGuidelines.map(g => ({
      ...g,
      type: 'manual',
      rulesCount: Array.isArray(g.rules) ? g.rules.length : 1
    }));

    const documentExtractedRules = [];
    data.uploadedDocuments.forEach(d => {
      if (Array.isArray(d.extractedRules) && d.extractedRules.length > 0) {
        d.extractedRules.forEach(r => {
          documentExtractedRules.push({
            id: r.id || `${d.id}-${r.code}`,
            title: r.title,
            category: r.category || 'Document Rule',
            priority: r.priority || 'High',
            description: r.ruleText,
            rules: [r.ruleText],
            sourceRef: r.sourceRef || d.name,
            organisation: (r.organisation && r.organisation !== 'General Workspace') ? r.organisation : (d.organisation || 'General Workspace'),
            type: 'document-rule',
            documentName: d.name,
            documentId: d.id,
            status: 'Active',
            rulesCount: 1
          });
        });
      } else if (d.extractedText) {
        // Fallback excerpt item if not yet structured
        documentExtractedRules.push({
          id: d.id,
          title: d.name,
          category: 'Document Ingestion',
          priority: 'High',
          description: `Ingested from ${d.name}`,
          rules: [d.extractedText.slice(0, 300)],
          sourceRef: d.name,
          organisation: d.organisation || 'General Workspace',
          type: 'document',
          documentName: d.name,
          documentId: d.id,
          status: 'Active',
          rulesCount: d.wordCount ? Math.ceil(d.wordCount / 50) : 1
        });
      }
    });

    return [...manualMapped, ...documentExtractedRules];
  }, [data.manualGuidelines, data.uploadedDocuments]);

  const currentOrg = data.selectedOrganisation || defaultOrgs[0];

  // Active persona tied to the active governance role
  const currentUser = useMemo(() => {
    const member = defaultTeamMembers.find(m => m.roleType === (data.currentUserRole || 'Manager'));
    return member || {
      id: 'tm-4',
      name: 'Workspace Administrator',
      role: 'Enterprise Administrator',
      roleType: data.currentUserRole || 'Manager'
    };
  }, [data.currentUserRole]);

  // Dynamically extract all distinct organisations
  const organisations = useMemo(() => {
    const set = new Set(defaultOrgs);
    if (Array.isArray(data.organisations)) {
      data.organisations.forEach(o => o && set.add(o.trim()));
    }
    data.uploadedDocuments.forEach(d => d.organisation && set.add(d.organisation.trim()));
    data.manualGuidelines.forEach(g => g.organisation && set.add(g.organisation.trim()));
    data.reviews.forEach(r => (r.organisationId || r.organisation) && set.add((r.organisationId || r.organisation).trim()));
    return Array.from(set);
  }, [data]);

  // ISOLATED COLLECTIONS EXCLUSIVELY FOR CURRENT ORGANISATION:
  const orgGuidelines = useMemo(() => {
    return allGuidelines.filter(g => matchesOrganisation(g.organisation, currentOrg));
  }, [allGuidelines, currentOrg]);

  const orgUploadedDocuments = useMemo(() => {
    return data.uploadedDocuments.filter(d => matchesOrganisation(d.organisation, currentOrg));
  }, [data.uploadedDocuments, currentOrg]);

  const orgManualGuidelines = useMemo(() => {
    return data.manualGuidelines.filter(g => matchesOrganisation(g.organisation, currentOrg));
  }, [data.manualGuidelines, currentOrg]);

  const orgReviews = useMemo(() => {
    return data.reviews.filter(r => matchesOrganisation(r.organisationId || r.organisation, currentOrg));
  }, [data.reviews, currentOrg]);

  const orgActivities = useMemo(() => {
    return data.activities.filter(a => !a.organisationId || matchesOrganisation(a.organisationId, currentOrg));
  }, [data.activities, currentOrg]);

  // ISOLATED NOTIFICATIONS FOR CURRENT ORGANISATION
  const orgNotifications = useMemo(() => {
    return (data.notifications || []).filter(n => !n.organisationId || matchesOrganisation(n.organisationId, currentOrg));
  }, [data.notifications, currentOrg]);

  // Approved Brand Color Tokens for current organisation
  const orgColorTokens = useMemo(() => {
    const custom = (data.colorTokens || []).filter(c => !c.organisation || matchesOrganisation(c.organisation, currentOrg));
    if (custom.length > 0) return custom;

    if (matchesOrganisation(currentOrg, 'BrightWave Analytics')) {
      return [
        { name: 'Tech Cobalt Blue', hex: '#536DFE', role: 'Primary Brand Color', organisation: 'BrightWave Analytics' },
        { name: 'Cyan Glow Accent', hex: '#00E5FF', role: 'Secondary Accent', organisation: 'BrightWave Analytics' },
        { name: 'Slate Dark Navy', hex: '#202B45', role: 'Typography & Headers', organisation: 'BrightWave Analytics' },
        { name: 'Neumorphic Slate', hex: '#E8ECF3', role: 'Background Canvas', organisation: 'BrightWave Analytics' }
      ];
    }
    if (matchesOrganisation(currentOrg, 'Northstar Digital')) {
      return [
        { name: 'Enterprise Midnight', hex: '#0A2540', role: 'Primary Brand Color', organisation: 'Northstar Digital' },
        { name: 'Stripe Indigo', hex: '#635BFF', role: 'Secondary Accent', organisation: 'Northstar Digital' },
        { name: 'Mint Cyan', hex: '#00D4B2', role: 'Highlight', organisation: 'Northstar Digital' },
        { name: 'Slate Gray', hex: '#425466', role: 'Body Typography', organisation: 'Northstar Digital' }
      ];
    }
    return [
      { name: 'Primary Brand Blue', hex: '#536DFE', role: 'Primary Brand Color', organisation: currentOrg },
      { name: 'Slate Dark', hex: '#202B45', role: 'Typography', organisation: currentOrg },
      { name: 'Slate Canvas', hex: '#E8ECF3', role: 'Background Canvas', organisation: currentOrg }
    ];
  }, [data.colorTokens, currentOrg]);

  // Approved Brand Logo Assets for current organisation
  const orgLogoAssets = useMemo(() => {
    return (data.logoAssets || []).filter(l => matchesOrganisation(l.organisation, currentOrg));
  }, [data.logoAssets, currentOrg]);

  const primaryOrgLogo = useMemo(() => {
    if (!orgLogoAssets || orgLogoAssets.length === 0) return null;
    return orgLogoAssets.find(l => l.isPrimary) || orgLogoAssets[0];
  }, [orgLogoAssets]);

  // Real computed metrics derived from actual reviews of current organization
  const metrics = useMemo(() => {
    const totalReviewed = orgReviews.length;
    const approvedReviews = orgReviews.filter((r) => r.status === 'Approved');
    const pendingReviews = orgReviews.filter((r) => r.status === 'Pending' || r.status === 'Under Review' || r.status === 'Pending Review' || r.status === 'Changes Requested');
    const flaggedReviews = orgReviews.filter((r) => r.status === 'Flagged');
    const rejectedReviews = orgReviews.filter((r) => r.status === 'Rejected');
    const changesRequestedReviews = orgReviews.filter((r) => r.status === 'Changes Requested');

    const criticalViolations = orgReviews.reduce((sum, r) => {
      const issueCount = Array.isArray(r.violations) ? r.violations.length : (Array.isArray(r.issues) ? r.issues.length : 0);
      return sum + issueCount;
    }, 0);

    const completedWithScores = orgReviews.filter((r) => typeof r.score === 'number');
    const averageScore = completedWithScores.length > 0
      ? Math.round(completedWithScores.reduce((acc, curr) => acc + curr.score, 0) / completedWithScores.length)
      : null;

    const approvalRate = totalReviewed > 0
      ? Math.round((approvedReviews.length / totalReviewed) * 100)
      : 0;

    return {
      totalReviewed,
      approvedCount: approvedReviews.length,
      approvalRate,
      pendingCount: pendingReviews.length,
      flaggedCount: flaggedReviews.length,
      rejectedCount: rejectedReviews.length,
      changesRequestedCount: changesRequestedReviews.length,
      criticalViolations,
      averageScore
    };
  }, [orgReviews]);

  // Real violation categories computed from real reviews of current organization
  const violationCategories = useMemo(() => {
    const catMap = {};
    orgReviews.forEach((r) => {
      const list = Array.isArray(r.violations) ? r.violations : (Array.isArray(r.issues) ? r.issues : []);
      list.forEach((item) => {
        const cat = item.category || 'General Compliance';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
    });

    const totalIssues = Object.values(catMap).reduce((a, b) => a + b, 0);
    if (totalIssues === 0) return [];

    const colors = ['#536DFE', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];
    return Object.entries(catMap).map(([name, count], idx) => ({
      name,
      count,
      percentage: Math.round((count / totalIssues) * 100),
      color: colors[idx % colors.length]
    }));
  }, [orgReviews]);

  // Real department scores for current organization
  const departmentScores = useMemo(() => {
    const deptMap = {};
    orgReviews.forEach((r) => {
      const dept = r.department || r.contentType || 'General';
      if (!deptMap[dept]) {
        deptMap[dept] = { totalScore: 0, count: 0 };
      }
      if (typeof r.score === 'number') {
        deptMap[dept].totalScore += r.score;
        deptMap[dept].count += 1;
      }
    });

    return Object.entries(deptMap).map(([department, val]) => ({
      department,
      score: Math.round(val.totalScore / val.count),
      volume: val.count
    }));
  }, [orgReviews]);

  // Real channel audits for current organization
  const channelAudits = useMemo(() => {
    const chMap = {};
    orgReviews.forEach((r) => {
      const ch = r.contentType || r.type || 'General Media';
      if (!chMap[ch]) {
        chMap[ch] = { total: 0, approved: 0, violations: 0 };
      }
      chMap[ch].total += 1;
      if (r.status === 'Approved') chMap[ch].approved += 1;
      const issues = Array.isArray(r.violations) ? r.violations.length : (Array.isArray(r.issues) ? r.issues.length : 0);
      chMap[ch].violations += issues;
    });

    return Object.entries(chMap).map(([channel, info]) => {
      const rate = info.total > 0 ? `${Math.round((info.approved / info.total) * 100)}%` : '0%';
      const risk = info.violations > 3 ? 'High' : info.violations > 0 ? 'Medium' : 'Low';
      return {
        channel,
        rate,
        violations: info.violations,
        risk
      };
    });
  }, [orgReviews]);

  // --- ACTIONS: UPLOADED GUIDELINE DOCUMENTS ---

  const addUploadedDocument = (doc) => {
    // Prevent duplicate upload (by name and size)
    const isDuplicate = data.uploadedDocuments.some(
      d => d.name.toLowerCase() === doc.name.toLowerCase() && d.fileSize === doc.fileSize
    );
    if (isDuplicate) {
      throw new Error(`A document named "${doc.name}" with the same size has already been uploaded.`);
    }

    const targetOrg = doc.organisation && doc.organisation !== 'General Workspace'
      ? doc.organisation
      : currentOrg;

    const newDoc = {
      id: `doc-${Date.now()}`,
      name: doc.name,
      fileType: doc.fileType || 'PDF',
      fileSize: doc.fileSize || 'Unknown',
      uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      extractedText: doc.extractedText || '',
      wordCount: doc.extractedText ? doc.extractedText.trim().split(/\s+/).length : 0,
      organisation: targetOrg,
      extractedRules: Array.isArray(doc.extractedRules)
        ? doc.extractedRules.map(r => ({
            ...r,
            organisation: (r.organisation && r.organisation !== 'General Workspace') ? r.organisation : targetOrg
          }))
        : []
    };

    const newActivity = {
      id: `act-${Date.now()}`,
      title: `Document Uploaded: ${newDoc.name} (${newDoc.extractedRules.length} rules extracted)`,
      type: 'Guideline Document',
      department: 'Brand Hub',
      organisationId: targetOrg,
      status: 'Approved',
      score: 100,
      submittedBy: 'Workspace Administrator',
      timestamp: 'Just now',
      violationsCount: 0
    };

    setData(prev => ({
      ...prev,
      uploadedDocuments: [newDoc, ...prev.uploadedDocuments],
      activities: [newActivity, ...prev.activities],
      organisations: Array.from(new Set([...(prev.organisations || defaultOrgs), targetOrg]))
    }));

    return newDoc;
  };

  const deleteUploadedDocument = (id) => {
    setData(prev => {
      const doc = prev.uploadedDocuments.find(d => d.id === id);
      const newActivity = doc ? {
        id: `act-${Date.now()}`,
        title: `Deleted Document: ${doc.name}`,
        type: 'Guideline Removal',
        department: 'Brand Hub',
        status: 'Approved',
        score: 100,
        submittedBy: 'Workspace Administrator',
        timestamp: 'Just now',
        violationsCount: 0
      } : null;

      return {
        ...prev,
        uploadedDocuments: prev.uploadedDocuments.filter(d => d.id !== id),
        activities: newActivity ? [newActivity, ...prev.activities] : prev.activities
      };
    });
  };

  // --- ACTIONS: MANUALLY CODIFIED GUIDELINES ---

  const addManualGuideline = (guideline) => {
    const targetOrg = guideline.organisation || currentOrg;
    const newGuideline = {
      id: `mgl-${Date.now()}`,
      title: guideline.title,
      category: guideline.category || 'Brand Voice and Tone',
      description: guideline.description || '',
      rules: Array.isArray(guideline.rules) ? guideline.rules : [guideline.rules || ''],
      priority: guideline.priority || 'Medium',
      organisation: targetOrg,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const newActivity = {
      id: `act-${Date.now()}`,
      title: `Guideline Added: ${newGuideline.title}`,
      type: 'Guideline Rule',
      department: 'Brand Hub',
      organisationId: targetOrg,
      status: 'Approved',
      score: 100,
      submittedBy: 'Workspace Administrator',
      timestamp: 'Just now',
      violationsCount: 0
    };

    setData(prev => ({
      ...prev,
      manualGuidelines: [newGuideline, ...prev.manualGuidelines],
      activities: [newActivity, ...prev.activities],
      organisations: Array.from(new Set([...(prev.organisations || defaultOrgs), targetOrg]))
    }));

    return newGuideline;
  };

  const updateManualGuideline = (id, updatedFields) => {
    setData(prev => ({
      ...prev,
      manualGuidelines: prev.manualGuidelines.map(g => {
        if (g.id === id) {
          return {
            ...g,
            ...updatedFields,
            updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          };
        }
        return g;
      })
    }));
  };

  const deleteManualGuideline = (id) => {
    setData(prev => {
      const g = prev.manualGuidelines.find(item => item.id === id);
      const newActivity = g ? {
        id: `act-${Date.now()}`,
        title: `Deleted Guideline: ${g.title}`,
        type: 'Guideline Removal',
        department: 'Brand Hub',
        status: 'Approved',
        score: 100,
        submittedBy: 'Workspace Administrator',
        timestamp: 'Just now',
        violationsCount: 0
      } : null;

      return {
        ...prev,
        manualGuidelines: prev.manualGuidelines.filter(item => item.id !== id),
        activities: newActivity ? [newActivity, ...prev.activities] : prev.activities
      };
    });
  };

  // --- ACTIONS: CONTENT REVIEWS & ANALYSIS ---

  const addReviewSubmission = (review) => {
    const newReviewId = `rev-${Date.now()}`;
    const initialContent = review.currentContent || review.extractedText || '';
    const initialFindings = review.findings || review.violations || [];
    const organisationId = review.organisationId || currentOrg;
    const now = new Date();
    const effectiveActor = review.submittedBy || currentUser.name;
    const effectiveRole = review.actorRole || currentUser.roleType || 'Creator';

    const initialVersion = {
      version: 1,
      timestamp: now.toISOString(),
      timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateFormatted: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      content: initialContent,
      score: typeof review.score === 'number' ? review.score : 0,
      status: review.status || 'Pending Review',
      summary: review.summary || '',
      findings: initialFindings,
      violations: initialFindings,
      checks: review.checks || [],
      visualAnalysis: review.visualAnalysis || null,
      modelUsed: review.modelUsed || 'gemini-3.5-flash',
      organisationId,
      note: 'Initial Submission'
    };

    const initialAuditEvent = {
      id: `audit-${Date.now()}-1`,
      type: 'submission',
      action: 'Content Submitted & Analyzed',
      actor: effectiveActor,
      role: effectiveRole,
      timestamp: now.toISOString(),
      formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      score: typeof review.score === 'number' ? review.score : 0,
      status: review.status || 'Pending Review',
      findingsCount: initialFindings.length,
      organisationId,
      submissionId: newReviewId,
      comments: `Initial compliance evaluation via ${review.modelUsed || 'gemini-3.5-flash'}`
    };

    const newReview = {
      id: newReviewId,
      title: review.title || 'Untitled Asset',
      contentType: review.contentType || 'General Content',
      submissionMode: review.submissionMode || 'text', // 'text' | 'file' | 'image'
      originalFile: review.originalFile || null,
      originalContent: initialContent,
      currentContent: initialContent,
      extractedText: initialContent,
      organisationId,
      department: review.department || review.contentType || 'Marketing',
      status: review.status || 'Pending Review', // Never automatically approved!
      score: typeof review.score === 'number' ? review.score : 0,
      submittedBy: effectiveActor,
      submittedByRole: effectiveRole,
      timestamp: 'Just now',
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      summary: review.summary || '',
      checks: review.checks || [],
      violations: initialFindings,
      findings: initialFindings,
      passedRules: review.passedRules || [],
      riskLevel: (review.score >= 85) ? 'Low' : (review.score >= 70) ? 'Medium' : 'High',
      visualAnalysis: review.visualAnalysis || null,
      modelUsed: review.modelUsed || 'gemini-3.5-flash',
      assignedTo: review.assignedTo || null,
      assignedToId: review.assignedToId || null,
      assignedBy: review.assignedBy || null,
      assignedAt: review.assignedAt || null,
      productionClearance: false,
      clearanceDetails: null,
      publishingStatus: 'Not Published',
      publishingHistory: [],
      publishedChannels: [],
      versions: [initialVersion],
      auditTrail: [initialAuditEvent],
      decisionDetails: null
    };

    const newNotification = {
      id: `notif-${Date.now()}`,
      type: (review.score < 70 || initialFindings.length > 2) ? 'critical' : 'info',
      title: `New Content Submitted: ${newReview.title}`,
      desc: `${newReview.contentType} submitted by ${effectiveActor} for ${organisationId}. Awaiting review sign-off.`,
      submissionId: newReviewId,
      link: 'review-approval',
      organisationId,
      targetRole: 'Manager',
      time: 'Just now',
      timestamp: now.toISOString(),
      read: false
    };

    const newActivity = {
      id: `act-${Date.now()}`,
      title: `${newReview.title} (${newReview.contentType})`,
      type: newReview.submissionMode === 'image'
        ? `Image Review (${newReview.originalFile?.fileType || 'Asset'})`
        : newReview.submissionMode === 'document' || newReview.submissionMode === 'file'
        ? `Document Review (${newReview.originalFile?.fileType || 'Asset'})`
        : 'Text Review',
      department: newReview.department,
      organisationId,
      status: newReview.status,
      score: newReview.score,
      submittedBy: effectiveActor,
      timestamp: 'Just now',
      violationsCount: newReview.violations ? newReview.violations.length : 0,
      issue: newReview.violations && newReview.violations[0] ? newReview.violations[0].explanation || newReview.violations[0].detail : null
    };

    setData(prev => ({
      ...prev,
      reviews: [newReview, ...prev.reviews],
      activities: [newActivity, ...prev.activities],
      notifications: [newNotification, ...(prev.notifications || []).slice(0, 49)],
      organisations: Array.from(new Set([...(prev.organisations || defaultOrgs), organisationId]))
    }));

    // Trigger content.submitted webhook dispatch in background
    try {
      fetch('/api/webhooks/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId,
          eventType: 'content.submitted',
          data: {
            submissionId: newReviewId,
            title: newReview.title,
            contentType: newReview.contentType,
            submittedBy: effectiveActor,
            score: newReview.score,
            riskLevel: newReview.riskLevel,
            status: newReview.status
          }
        })
      }).catch(() => {});
    } catch (_) {}

    // Trigger Slack notification for content.submitted
    try {
      fetch('/api/slack/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId,
          eventType: 'content.submitted',
          data: {
            submissionId: newReviewId,
            title: newReview.title,
            contentType: newReview.contentType,
            actor: effectiveActor,
            role: 'Creator',
            score: newReview.score,
            riskLevel: newReview.riskLevel,
            status: newReview.status || 'Pending Review',
            reviewLink: 'http://localhost:3000/#review-approval'
          }
        })
      }).catch(() => {});
    } catch (_) {}

    return newReview;
  };

  const updateReviewWithReanalysis = (reviewId, updatedData) => {
    setData(prev => {
      const now = new Date();
      const effectiveActor = updatedData.actor || currentUser.name;
      const effectiveRole = updatedData.role || currentUser.roleType || 'Creator';

      const updatedReviews = prev.reviews.map(r => {
        if (r.id === reviewId) {
          const prevVersions = Array.isArray(r.versions) && r.versions.length > 0 ? r.versions : [
            {
              version: 1,
              timestamp: r.date || now.toISOString(),
              timeFormatted: 'Initial',
              dateFormatted: r.date || 'Initial',
              content: r.originalContent || r.extractedText || '',
              score: r.score,
              status: r.status,
              summary: r.summary,
              findings: r.violations || [],
              violations: r.violations || [],
              checks: r.checks || [],
              modelUsed: r.modelUsed || 'gemini-3.5-flash',
              organisationId: r.organisationId || 'Salesforce',
              note: 'Initial Submission'
            }
          ];

          const nextVersionNum = prevVersions.length + 1;
          const newFindings = updatedData.findings || updatedData.violations || [];
          const organisationId = r.organisationId || updatedData.organisationId || 'Salesforce';

          const newVersion = {
            version: nextVersionNum,
            timestamp: now.toISOString(),
            timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateFormatted: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            content: updatedData.content,
            score: typeof updatedData.score === 'number' ? updatedData.score : 0,
            status: updatedData.status || 'Pending Review', // Never automatically approved!
            summary: updatedData.summary || '',
            findings: newFindings,
            violations: newFindings,
            checks: updatedData.checks || [],
            visualAnalysis: updatedData.visualAnalysis !== undefined ? updatedData.visualAnalysis : (r.visualAnalysis || null),
            modelUsed: updatedData.modelUsed || 'gemini-3.5-flash',
            organisationId,
            note: updatedData.note || `Re-analysis (v${nextVersionNum})`
          };

          const reanalysisAuditEvent = {
            id: `audit-${Date.now()}-re`,
            type: 'reanalysis',
            action: `Content Re-analysed (v${nextVersionNum})`,
            actor: effectiveActor,
            role: effectiveRole,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            score: typeof updatedData.score === 'number' ? updatedData.score : 0,
            status: updatedData.status || 'Pending Review',
            findingsCount: newFindings.length,
            organisationId,
            submissionId: reviewId,
            comments: `Re-evaluated via ${updatedData.modelUsed || 'gemini-3.5-flash'}. Score updated to ${updatedData.score}%.`
          };

          const prevAudit = Array.isArray(r.auditTrail) ? r.auditTrail : [];

          return {
            ...r,
            currentContent: updatedData.content,
            extractedText: updatedData.content,
            score: typeof updatedData.score === 'number' ? updatedData.score : 0,
            status: updatedData.status || 'Pending Review', // Never automatically approved!
            summary: updatedData.summary || r.summary,
            violations: newFindings,
            findings: newFindings,
            checks: updatedData.checks || r.checks,
            visualAnalysis: updatedData.visualAnalysis !== undefined ? updatedData.visualAnalysis : (r.visualAnalysis || null),
            modelUsed: updatedData.modelUsed || r.modelUsed,
            riskLevel: (updatedData.score >= 85) ? 'Low' : (updatedData.score >= 70) ? 'Medium' : 'High',
            versions: [...prevVersions, newVersion],
            auditTrail: [...prevAudit, reanalysisAuditEvent]
          };
        }
        return r;
      });

      const target = prev.reviews.find(r => r.id === reviewId);
      const reanalysisNotification = target ? {
        id: `notif-${Date.now()}-re`,
        type: 'warning',
        title: `Revisions Re-analysed: ${target.title}`,
        desc: `Score updated to ${updatedData.score}% (v${(target.versions?.length || 1) + 1}) by ${effectiveActor}.`,
        submissionId: reviewId,
        link: 'review-approval',
        organisationId: target.organisationId,
        time: 'Just now',
        timestamp: now.toISOString(),
        read: false
      } : null;

      const newActivity = target ? {
        id: `act-${Date.now()}`,
        title: `${target.title} Re-analysed (v${(target.versions?.length || 1) + 1})`,
        type: 'Content Re-analysis',
        department: target.department,
        status: updatedData.status || 'Pending Review',
        score: updatedData.score,
        submittedBy: effectiveActor,
        timestamp: 'Just now',
        violationsCount: updatedData.findings ? updatedData.findings.length : 0,
        issue: updatedData.findings && updatedData.findings[0] ? updatedData.findings[0].explanation || updatedData.findings[0].detail : null
      } : null;

      return {
        ...prev,
        reviews: updatedReviews,
        activities: newActivity ? [newActivity, ...prev.activities] : prev.activities,
        notifications: reanalysisNotification ? [reanalysisNotification, ...(prev.notifications || []).slice(0, 49)] : prev.notifications
      };
    });
  };

  const updateReviewStatus = (id, newStatus, reviewerNotes = '', reviewerName = null, reviewerRole = null) => {
    // Creator role is strictly unauthorized to approve, reject, or request changes
    if (data.currentUserRole === 'Creator') {
      throw new Error('Access Denied: Creator role cannot approve, reject, or request revisions on submissions.');
    }

    const effectiveReviewer = reviewerName || currentUser.name;
    const effectiveRole = reviewerRole || currentUser.roleType || 'Reviewer';

    setData(prev => {
      const target = prev.reviews.find(r => r.id === id);
      const organisationId = target?.organisationId || currentOrg;
      const now = new Date();

      const decisionDetails = {
        reviewer: effectiveReviewer,
        role: effectiveRole,
        decision: newStatus,
        comments: reviewerNotes || '',
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        organisationId,
        submissionId: id
      };

      const decisionAuditEvent = {
        id: `audit-${Date.now()}-dec`,
        type: 'decision',
        action: `Reviewer Decision: ${newStatus}`,
        actor: effectiveReviewer,
        role: effectiveRole,
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        decision: newStatus,
        comments: reviewerNotes || '',
        score: target ? target.score : 0,
        organisationId,
        submissionId: id
      };

      let statusNotification = null;
      if (target) {
        if (newStatus === 'Changes Requested') {
          statusNotification = {
            id: `notif-${Date.now()}-cr`,
            type: 'warning',
            title: `Revision Requested: ${target.title}`,
            desc: `${effectiveReviewer} (${effectiveRole}) requested revisions: "${reviewerNotes}".`,
            submissionId: id,
            link: 'content-review',
            organisationId,
            targetUser: target.submittedBy,
            targetRole: 'Creator',
            time: 'Just now',
            timestamp: now.toISOString(),
            read: false
          };
        } else if (newStatus === 'Rejected') {
          statusNotification = {
            id: `notif-${Date.now()}-rej`,
            type: 'critical',
            title: `Submission Rejected: ${target.title}`,
            desc: `Rejected by ${effectiveReviewer} (${effectiveRole}). Reason: "${reviewerNotes}".`,
            submissionId: id,
            link: 'content-review',
            organisationId,
            targetUser: target.submittedBy,
            targetRole: 'Creator',
            time: 'Just now',
            timestamp: now.toISOString(),
            read: false
          };
        } else if (newStatus === 'Approved') {
          statusNotification = {
            id: `notif-${Date.now()}-app`,
            type: 'success',
            title: `Submission Approved: ${target.title}`,
            desc: `Approved by ${effectiveReviewer} (${effectiveRole}) with score ${target.score}%. Ready for final clearance.`,
            submissionId: id,
            link: 'review-approval',
            organisationId,
            targetUser: target.submittedBy,
            targetRole: 'Creator',
            time: 'Just now',
            timestamp: now.toISOString(),
            read: false
          };
        }
      }

      const updatedReviews = prev.reviews.map(r => {
        if (r.id === id) {
          const prevTrail = Array.isArray(r.auditTrail) ? r.auditTrail : [];
          return {
            ...r,
            status: newStatus,
            reviewerNotes: reviewerNotes || r.reviewerNotes,
            decisionDetails,
            auditTrail: [...prevTrail, decisionAuditEvent]
          };
        }
        return r;
      });

      const newActivity = target ? {
        id: `act-${Date.now()}`,
        title: `${target.title} marked as ${newStatus}`,
        type: target.contentType,
        department: target.department,
        status: newStatus,
        score: target.score,
        submittedBy: `${effectiveReviewer} (${effectiveRole})`,
        timestamp: 'Just now',
        violationsCount: target.violations ? target.violations.length : 0,
        issue: reviewerNotes ? `Decision Note: ${reviewerNotes}` : null
      } : null;

      // Webhook dispatch on decision
      if (target && (newStatus === 'Approved' || newStatus === 'Rejected')) {
        const eventType = newStatus === 'Approved' ? 'content.approved' : 'content.rejected';
        try {
          fetch('/api/webhooks/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organisationId: target.organisationId,
              eventType,
              data: {
                submissionId: id,
                title: target.title,
                status: newStatus,
                score: target.score,
                reviewer: effectiveReviewer,
                notes: reviewerNotes
              }
            })
          }).catch(() => {});
        } catch (_) {}
      }

      // Slack notification dispatch on governance decisions
      if (target) {
        let slackEvent = null;
        if (newStatus === 'Approved') slackEvent = 'content.approved';
        else if (newStatus === 'Rejected') slackEvent = 'content.rejected';
        else if (newStatus === 'Changes Requested') slackEvent = 'revision.requested';

        if (slackEvent) {
          try {
            fetch('/api/slack/dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                organisationId: target.organisationId,
                eventType: slackEvent,
                data: {
                  submissionId: id,
                  title: target.title,
                  status: newStatus,
                  score: target.score,
                  riskLevel: target.riskLevel,
                  actor: effectiveReviewer,
                  role: effectiveRole,
                  notes: reviewerNotes,
                  reviewLink: 'http://localhost:3000/#review-approval'
                }
              })
            }).catch(() => {});
          } catch (_) {}
        }
      }

      return {
        ...prev,
        reviews: updatedReviews,
        activities: newActivity ? [newActivity, ...prev.activities] : prev.activities,
        notifications: statusNotification ? [statusNotification, ...(prev.notifications || []).slice(0, 49)] : prev.notifications
      };
    });
  };

  const assignReview = (reviewId, assigneeName, managerName = null) => {
    // Only Manager is authorized to assign or reassign reviewers
    if (data.currentUserRole === 'Creator') {
      throw new Error('Access Denied: Creator role cannot assign reviewers.');
    }

    const effectiveManager = managerName || currentUser.name;
    const targetMember = defaultTeamMembers.find(m => m.name === assigneeName);

    setData(prev => {
      const target = prev.reviews.find(r => r.id === reviewId);
      if (!target) return prev;
      const now = new Date();

      const assignAuditEvent = {
        id: `audit-${Date.now()}-asg`,
        type: 'assignment',
        action: `Reviewer Assigned: ${assigneeName}`,
        actor: effectiveManager,
        role: 'Manager',
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        organisationId: target.organisationId,
        submissionId: reviewId,
        comments: `Review ownership assigned to ${assigneeName}.`
      };

      const assignNotification = {
        id: `notif-${Date.now()}-asg`,
        type: 'info',
        title: `Reviewer Assigned: ${target.title}`,
        desc: `Assigned to ${assigneeName} by Manager ${effectiveManager} for compliance review.`,
        submissionId: reviewId,
        link: 'review-approval',
        organisationId: target.organisationId,
        targetUser: assigneeName,
        targetRole: 'Reviewer',
        time: 'Just now',
        timestamp: now.toISOString(),
        read: false
      };

      const updatedReviews = prev.reviews.map(r => {
        if (r.id === reviewId) {
          const prevTrail = Array.isArray(r.auditTrail) ? r.auditTrail : [];
          return {
            ...r,
            assignedTo: assigneeName,
            assignedToId: targetMember?.id || null,
            assignedBy: effectiveManager,
            assignedAt: now.toISOString(),
            auditTrail: [...prevTrail, assignAuditEvent]
          };
        }
        return r;
      });

      // Slack dispatch for reviewer assignment
      try {
        fetch('/api/slack/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organisationId: target.organisationId,
            eventType: 'reviewer.assigned',
            data: {
              submissionId: reviewId,
              title: target.title,
              actor: effectiveManager,
              role: 'Manager',
              status: `Assigned to ${assigneeName}`,
              score: target.score,
              riskLevel: target.riskLevel,
              notes: `Review ownership assigned to ${assigneeName} for compliance verification.`,
              reviewLink: 'http://localhost:3000/#review-approval'
            }
          })
        }).catch(() => {});
      } catch (_) {}

      return {
        ...prev,
        reviews: updatedReviews,
        notifications: [assignNotification, ...(prev.notifications || []).slice(0, 49)]
      };
    });
  };

  const grantProductionClearance = (reviewId, clearanceNotes = '', managerName = null) => {
    // Final clearance is strictly restricted to Manager role
    if (data.currentUserRole !== 'Manager') {
      throw new Error('Access Denied: Final production clearance requires Manager credentials.');
    }

    const effectiveManager = managerName || currentUser.name;

    setData(prev => {
      const target = prev.reviews.find(r => r.id === reviewId);
      if (!target) return prev;
      const now = new Date();

      const clearanceDetails = {
        manager: effectiveManager,
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        notes: clearanceNotes || 'Verified compliant and approved for enterprise distribution.'
      };

      const clearanceAuditEvent = {
        id: `audit-${Date.now()}-clr`,
        type: 'clearance',
        action: 'Final Production Clearance Granted',
        actor: effectiveManager,
        role: 'Manager',
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        organisationId: target.organisationId,
        submissionId: reviewId,
        comments: clearanceNotes || 'Final production clearance granted by compliance management.'
      };

      const clearanceNotification = {
        id: `notif-${Date.now()}-clr`,
        type: 'success',
        title: `Final Production Clearance: ${target.title}`,
        desc: `Production clearance approved by Manager ${effectiveManager} for ${target.organisationId}.`,
        submissionId: reviewId,
        link: 'review-approval',
        organisationId: target.organisationId,
        targetRole: 'All',
        time: 'Just now',
        timestamp: now.toISOString(),
        read: false
      };

      const newActivity = {
        id: `act-${Date.now()}`,
        title: `Production Clearance: ${target.title}`,
        type: 'Production Clearance',
        department: target.department,
        status: 'Cleared for Production',
        score: target.score,
        submittedBy: `${effectiveManager} (Manager)`,
        timestamp: 'Just now',
        violationsCount: 0
      };

      const updatedReviews = prev.reviews.map(r => {
        if (r.id === reviewId) {
          const prevTrail = Array.isArray(r.auditTrail) ? r.auditTrail : [];
          return {
            ...r,
            productionClearance: true,
            clearanceDetails,
            auditTrail: [...prevTrail, clearanceAuditEvent]
          };
        }
        return r;
      });

      // Webhook dispatch on production clearance
      if (target) {
        try {
          fetch('/api/webhooks/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organisationId: target.organisationId,
              eventType: 'production.clearance',
              data: {
                submissionId: reviewId,
                title: target.title,
                status: 'Cleared for Production',
                score: target.score,
                manager: effectiveManager,
                clearanceNotes: clearanceDetails.notes
              }
            })
          }).catch(() => {});
        } catch (_) {}

        // Slack dispatch for production clearance
        try {
          fetch('/api/slack/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organisationId: target.organisationId,
              eventType: 'production.clearance',
              data: {
                submissionId: reviewId,
                title: target.title,
                status: 'Cleared for Production',
                score: target.score,
                riskLevel: target.riskLevel,
                actor: effectiveManager,
                role: 'Manager',
                notes: clearanceDetails.notes,
                reviewLink: 'http://localhost:3000/#review-approval'
              }
            })
          }).catch(() => {});
        } catch (_) {}
      }

      return {
        ...prev,
        reviews: updatedReviews,
        activities: [newActivity, ...prev.activities],
        notifications: [clearanceNotification, ...(prev.notifications || []).slice(0, 49)]
      };
    });
  };

  const publishApprovedAsset = async (reviewId, platform, options = {}) => {
    const { isSimulation = false, notes = '', postStatus = 'draft' } = options;

    // Check manager authorization
    const activeRole = data.currentUserRole || 'Manager';
    if (activeRole !== 'Manager') {
      return {
        success: false,
        message: 'Access Denied: External publishing requires Manager credentials.'
      };
    }

    const target = data.reviews.find(r => r.id === reviewId);
    if (!target) {
      return { success: false, message: 'Asset not found.' };
    }

    // Check Status
    if (target.status !== 'Approved') {
      return {
        success: false,
        message: 'Only Approved assets can be submitted for publishing.'
      };
    }

    // Check Final Manager Production Clearance
    if (!target.productionClearance) {
      return {
        success: false,
        message: 'Production Clearance Required: Content must receive final Manager clearance before external dispatch.'
      };
    }

    const activeUser = currentUser || { name: 'Alex Rivera', roleType: 'Manager' };
    const effectiveActor = activeUser.name;
    const effectiveRole = activeUser.roleType || activeRole;
    const now = new Date();
    const isSimulated = Boolean(isSimulation);

    // -------------------------------------------------------------
    // PATH 1: Genuine Live WordPress REST API Publishing
    // -------------------------------------------------------------
    if (!isSimulated && platform === 'WordPress CMS') {
      try {
        const wpRes = await fetch('/api/wordpress/publish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-BrandGuard-Role': activeRole
          },
          body: JSON.stringify({
            organisationId: target.organisationId,
            submissionId: reviewId,
            title: target.title,
            content: target.originalContent || target.extractedText || target.content || target.summary || '',
            excerpt: target.summary || '',
            status: postStatus,
            actor: effectiveActor,
            role: effectiveRole,
            isProductionCleared: Boolean(target.productionClearance)
          })
        });

        const wpData = await wpRes.json();

        if (wpRes.ok && wpData.success) {
          const postId = wpData.post?.id;
          const postUrl = wpData.post?.url;
          const publishedStatus = wpData.post?.status || postStatus;

          const publishAuditEvent = {
            id: `audit-${Date.now()}-pubwp`,
            type: 'publish_wordpress',
            action: `Published to WordPress (Post #${postId})`,
            actor: effectiveActor,
            role: effectiveRole,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            organisationId: target.organisationId,
            submissionId: reviewId,
            comments: `WordPress REST API: Live post verified at ${postUrl} with status "${publishedStatus}". Post ID: ${postId}. ${notes}`.trim()
          };

          const historyEntry = {
            id: `pubhist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            channel: 'WordPress CMS',
            status: publishedStatus === 'publish' ? 'Published' : 'Draft Created',
            isSimulation: false,
            wordpressPostId: postId,
            publishedUrl: postUrl,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actor: effectiveActor,
            role: effectiveRole,
            notes: `Official WordPress REST API: Post #${postId} (${publishedStatus}). URL: ${postUrl}`
          };

          const publishNotification = {
            id: `notif-${Date.now()}-pub`,
            type: 'success',
            title: `Asset Published: WordPress (Post #${postId})`,
            desc: `"${target.title}" successfully published to WordPress (${publishedStatus}). Post ID: ${postId}`,
            submissionId: reviewId,
            organisationId: target.organisationId,
            link: 'review-approval',
            targetRole: 'Manager',
            time: 'Just now',
            timestamp: now.toISOString(),
            read: false
          };

          setData(prev => ({
            ...prev,
            reviews: prev.reviews.map(r => {
              if (r.id === reviewId) {
                const prevTrail = Array.isArray(r.auditTrail) ? r.auditTrail : [];
                const prevHistory = Array.isArray(r.publishingHistory) ? r.publishingHistory : [];
                const prevChannels = Array.isArray(r.publishedChannels) ? r.publishedChannels : [];
                return {
                  ...r,
                  publishingStatus: 'Published',
                  wordpressPostId: postId,
                  publishedUrl: postUrl,
                  publishedChannels: Array.from(new Set([...prevChannels, `WordPress CMS (Post #${postId})`])),
                  publishingHistory: [historyEntry, ...prevHistory],
                  auditTrail: [...prevTrail, publishAuditEvent]
                };
              }
              return r;
            }),
            notifications: [publishNotification, ...(prev.notifications || []).slice(0, 49)]
          }));

          // Trigger Slack notification for WordPress live publishing
          try {
            fetch('/api/slack/dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                organisationId: target.organisationId,
                eventType: 'wordpress.published',
                data: {
                  submissionId: reviewId,
                  title: target.title,
                  actor: effectiveActor,
                  role: effectiveRole,
                  status: `Published to WordPress (Post #${postId})`,
                  score: target.score,
                  riskLevel: target.riskLevel,
                  notes: `Live WordPress REST API: Post #${postId} (${publishedStatus}). URL: ${postUrl}`,
                  reviewLink: postUrl || 'http://localhost:3000/#review-approval'
                }
              })
            }).catch(() => {});
          } catch (_) {}

          return {
            success: true,
            isSimulation: false,
            post: wpData.post,
            message: `Successfully published to WordPress (Post ID: ${postId}) as ${publishedStatus === 'publish' ? 'Live Post' : 'Draft'}!`
          };
        } else {
          // Genuine WordPress error: DO NOT fall back to simulation!
          const errorMsg = wpData.error || 'WordPress REST API returned a publishing error.';
          recordPublishingFailure(reviewId, 'WordPress CMS', errorMsg, false);
          return {
            success: false,
            error: errorMsg,
            message: errorMsg
          };
        }
      } catch (err) {
        const errorMsg = `Network error contacting WordPress: ${err.message}`;
        recordPublishingFailure(reviewId, 'WordPress CMS', errorMsg, false);
        return {
          success: false,
          error: errorMsg,
          message: errorMsg
        };
      }
    }

    // -------------------------------------------------------------
    // PATH 2: Live dispatch without credentials for other platforms
    // -------------------------------------------------------------
    if (!isSimulated && platform !== 'Custom Webhooks' && platform !== 'WordPress CMS') {
      const errorMsg = `Live Connection Unavailable: ${platform} requires verified API authentication credentials. Use Simulation Mode for testing or configure integration in Settings.`;
      recordPublishingFailure(reviewId, platform, errorMsg, false);
      return { success: false, message: errorMsg };
    }

    // -------------------------------------------------------------
    // PATH 3: Simulation Mode or Custom Webhooks
    // -------------------------------------------------------------
    let result = { success: false, message: '' };
    setData(prev => {
      const channelLabel = isSimulated ? `${platform} (Sandbox)` : platform;

      const publishAuditEvent = {
        id: `audit-${Date.now()}-pub`,
        type: 'publish',
        action: isSimulated ? `Simulated Dispatch to ${platform}` : `Published to ${platform}`,
        actor: effectiveActor,
        role: effectiveRole,
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        organisationId: target.organisationId,
        submissionId: reviewId,
        comments: isSimulated
          ? `[SIMULATION SANDBOX] Asset dispatched in demonstration sandbox mode. No live API transmission occurred. ${notes}`.trim()
          : `Asset cleared and dispatched to ${platform} production pipeline. ${notes}`.trim()
      };

      const historyEntry = {
        id: `pubhist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        channel: platform,
        status: isSimulated ? 'Published (Simulated)' : 'Published',
        isSimulation: isSimulated,
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: effectiveActor,
        role: effectiveRole,
        notes: notes || (isSimulated ? 'Dispatched to simulation sandbox' : 'Dispatched to production')
      };

      const publishNotification = {
        id: `notif-${Date.now()}-pub`,
        type: 'success',
        title: isSimulated ? `Asset Dispatched (Simulation): ${platform}` : `Asset Published: ${platform}`,
        desc: isSimulated
          ? `"${target.title}" was dispatched to the ${platform} sandbox. No live production publish occurred.`
          : `"${target.title}" was successfully deployed to ${platform}.`,
        submissionId: reviewId,
        organisationId: target.organisationId,
        link: 'review-approval',
        targetRole: 'Manager',
        time: 'Just now',
        timestamp: now.toISOString(),
        read: false
      };

      const newActivity = {
        id: `act-${Date.now()}`,
        title: `${isSimulated ? '[Sandbox] ' : ''}Published to ${platform}: ${target.title}`,
        type: 'CMS / Social Dispatch',
        department: target.department,
        organisationId: target.organisationId,
        status: 'Published',
        score: target.score,
        submittedBy: `${effectiveActor} (${effectiveRole})`,
        timestamp: 'Just now',
        violationsCount: 0
      };

      const updatedReviews = prev.reviews.map(r => {
        if (r.id === reviewId) {
          const prevTrail = Array.isArray(r.auditTrail) ? r.auditTrail : [];
          const publishedChannels = Array.isArray(r.publishedChannels) ? r.publishedChannels : [];
          const prevHistory = Array.isArray(r.publishingHistory) ? r.publishingHistory : [];

          return {
            ...r,
            publishingStatus: 'Published',
            publishedChannels: Array.from(new Set([...publishedChannels, channelLabel])),
            publishingHistory: [historyEntry, ...prevHistory],
            auditTrail: [...prevTrail, publishAuditEvent]
          };
        }
        return r;
      });

      result = {
        success: true,
        isSimulation: isSimulated,
        message: isSimulated
          ? `Simulated Dispatch (Sandbox) — "${target.title}" dispatched to ${platform} test sandbox. No live external production publish occurred.`
          : `Successfully published "${target.title}" to ${platform}!`
      };

      // Trigger webhook event async if Custom Webhooks
      if (!isSimulated && platform === 'Custom Webhooks') {
        try {
          fetch('/api/webhooks/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organisationId: target.organisationId,
              eventType: 'content.published',
              data: {
                submissionId: target.id,
                title: target.title,
                channel: platform,
                isSimulation: false,
                publishedBy: effectiveActor,
                score: target.score,
                status: 'Published'
              }
            })
          }).catch(() => {});
        } catch (_) {}
      }

      // Trigger Slack notification for published content
      try {
        fetch('/api/slack/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organisationId: target.organisationId,
            eventType: 'content.published',
            data: {
              submissionId: target.id,
              title: target.title,
              actor: effectiveActor,
              role: effectiveRole,
              status: isSimulated ? `Dispatched to ${platform} (Simulated)` : `Published to ${platform}`,
              score: target.score,
              riskLevel: target.riskLevel,
              notes: notes || `Dispatched to ${platform}`,
              reviewLink: 'http://localhost:3000/#review-approval'
            }
          })
        }).catch(() => {});
      } catch (_) {}

      return {
        ...prev,
        reviews: updatedReviews,
        activities: [newActivity, ...prev.activities],
        notifications: [publishNotification, ...(prev.notifications || []).slice(0, 49)]
      };
    });

    return result;
  };

  const recordPublishingFailure = (reviewId, platform, errorMessage, isSimulation = false) => {
    let result = { success: false, message: errorMessage };
    setData(prev => {
      const target = prev.reviews.find(r => r.id === reviewId);
      if (!target) return prev;
      const now = new Date();
      const activeUser = currentUser || { name: 'Alex Rivera', roleType: 'Manager' };
      const effectiveActor = activeUser.name;
      const effectiveRole = activeUser.roleType || 'Manager';

      const failureEntry = {
        id: `pubhist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        channel: platform,
        status: 'Failed',
        isSimulation: Boolean(isSimulation),
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: effectiveActor,
        role: effectiveRole,
        notes: errorMessage
      };

      const failureAuditEvent = {
        id: `audit-${Date.now()}-pubfail`,
        type: 'publish_failed',
        action: `Publish Failed to ${platform}`,
        actor: effectiveActor,
        role: effectiveRole,
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        organisationId: target.organisationId,
        submissionId: reviewId,
        comments: `Publishing failed: ${errorMessage}`
      };

      const updatedReviews = prev.reviews.map(r => {
        if (r.id === reviewId) {
          const prevTrail = Array.isArray(r.auditTrail) ? r.auditTrail : [];
          const prevHistory = Array.isArray(r.publishingHistory) ? r.publishingHistory : [];
          return {
            ...r,
            publishingStatus: 'Failed',
            publishingHistory: [failureEntry, ...prevHistory],
            auditTrail: [...prevTrail, failureAuditEvent]
          };
        }
        return r;
      });

      return {
        ...prev,
        reviews: updatedReviews
      };
    });
    return result;
  };

  const fetchWebhookConfig = async (orgId) => {
    try {
      const res = await fetch(`/api/webhooks/config?organisationId=${encodeURIComponent(orgId || currentOrg)}`);
      const dataRes = await res.json();
      return dataRes.config || null;
    } catch {
      return null;
    }
  };

  const saveWebhookSettings = async (updates, orgId) => {
    try {
      const res = await fetch('/api/webhooks/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BrandGuard-Role': data.currentUserRole || 'Manager'
        },
        body: JSON.stringify({
          organisationId: orgId || currentOrg,
          role: data.currentUserRole || 'Manager',
          ...updates
        })
      });
      const dataRes = await res.json();
      return dataRes;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const testWebhookEndpoint = async (orgId) => {
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BrandGuard-Role': data.currentUserRole || 'Manager'
        },
        body: JSON.stringify({
          organisationId: orgId || currentOrg,
          role: data.currentUserRole || 'Manager'
        })
      });
      const dataRes = await res.json();
      return dataRes;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const fetchWordPressConfig = async (orgId) => {
    try {
      const res = await fetch(`/api/wordpress/config?organisationId=${encodeURIComponent(orgId || currentOrg)}`);
      const dataRes = await res.json();
      return dataRes.config || null;
    } catch {
      return null;
    }
  };

  const connectWordPress = async (orgId, { wpUrl, username, appPassword }) => {
    try {
      const res = await fetch('/api/wordpress/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BrandGuard-Role': data.currentUserRole || 'Manager'
        },
        body: JSON.stringify({
          organisationId: orgId || currentOrg,
          role: data.currentUserRole || 'Manager',
          wpUrl,
          username,
          appPassword
        })
      });
      const dataRes = await res.json();
      return dataRes;
    } catch (err) {
      return { success: false, status: 'Authentication Failed', error: err.message };
    }
  };

  const disconnectWordPress = async (orgId) => {
    try {
      const res = await fetch('/api/wordpress/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BrandGuard-Role': data.currentUserRole || 'Manager'
        },
        body: JSON.stringify({
          organisationId: orgId || currentOrg,
          role: data.currentUserRole || 'Manager'
        })
      });
      const dataRes = await res.json();
      return dataRes;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Slack Integration API Helpers
  const fetchSlackConfig = async (orgId) => {
    try {
      const target = orgId || currentOrg;
      const res = await fetch(`/api/slack/config?organisation=${encodeURIComponent(target)}`);
      const dataRes = await res.json();
      return dataRes.config || dataRes || null;
    } catch {
      return null;
    }
  };

  const connectSlack = async (orgId, { webhookUrl, channel, isSimulation }) => {
    try {
      const res = await fetch('/api/slack/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BrandGuard-Role': data.currentUserRole || 'Manager'
        },
        body: JSON.stringify({
          organisationId: orgId || currentOrg,
          role: data.currentUserRole || 'Manager',
          webhookUrl,
          channel,
          isSimulation
        })
      });
      const dataRes = await res.json();
      return dataRes;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const testSlackNotification = async (orgId) => {
    try {
      const res = await fetch('/api/slack/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BrandGuard-Role': data.currentUserRole || 'Manager'
        },
        body: JSON.stringify({
          organisationId: orgId || currentOrg,
          role: data.currentUserRole || 'Manager'
        })
      });
      const dataRes = await res.json();
      return dataRes;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const disconnectSlack = async (orgId) => {
    try {
      const res = await fetch('/api/slack/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BrandGuard-Role': data.currentUserRole || 'Manager'
        },
        body: JSON.stringify({
          organisationId: orgId || currentOrg,
          role: data.currentUserRole || 'Manager'
        })
      });
      const dataRes = await res.json();
      return dataRes;
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const dispatchSlackNotificationEvent = async (orgId, eventType, eventData = {}) => {
    try {
      const res = await fetch('/api/slack/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId: orgId || currentOrg,
          eventType,
          data: eventData
        })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const setCurrentUserRole = (role) => {
    setData(prev => ({
      ...prev,
      currentUserRole: role
    }));
  };

  const addNotification = (notif) => {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: notif.type || 'info',
      title: notif.title,
      desc: notif.desc || '',
      link: notif.link || null,
      submissionId: notif.submissionId || null,
      time: 'Just now',
      timestamp: new Date().toISOString(),
      read: false
    };
    setData(prev => ({
      ...prev,
      notifications: [newNotif, ...(prev.notifications || []).slice(0, 49)]
    }));
    return newNotif;
  };

  const clearNotifications = () => {
    setData(prev => ({
      ...prev,
      notifications: []
    }));
  };

  const markNotificationRead = (id) => {
    setData(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n => n.id === id ? { ...n, read: true } : n)
    }));
  };

  const updateSettings = (newSettings) => {
    setData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings
      }
    }));
  };

  const addColorToken = (token) => {
    setData(prev => ({
      ...prev,
      colorTokens: [...prev.colorTokens, token]
    }));
  };

  const addLogoAsset = (logo) => {
    const targetOrg = logo.organisation || currentOrg;
    const isFirstForOrg = !(data.logoAssets || []).some(l => matchesOrganisation(l.organisation, targetOrg));
    const shouldBePrimary = logo.isPrimary !== undefined ? logo.isPrimary : isFirstForOrg;

    const newLogo = {
      id: `logo-${Date.now()}`,
      name: logo.name || 'Master Logo',
      fileName: logo.fileName || 'logo.png',
      fileType: logo.fileType || 'PNG',
      variant: logo.variant || 'Primary Master',
      previewUrl: logo.previewUrl,
      pngBase64: logo.pngBase64 || (logo.previewUrl ? logo.previewUrl.replace(/^data:[^;]+;base64,/, '') : ''),
      svgContent: logo.svgContent || '',
      mimeType: logo.mimeType || (logo.fileType === 'SVG' ? 'image/svg+xml' : 'image/png'),
      fileSize: logo.fileSize || '150 KB',
      organisation: targetOrg,
      isPrimary: shouldBePrimary,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      notes: logo.notes || 'Approved brand logo asset'
    };

    const newActivity = {
      id: `act-${Date.now()}`,
      title: `Approved Logo Registered: ${newLogo.name} (${newLogo.fileType})`,
      type: 'Brand Asset Registration',
      department: 'Brand Hub',
      organisationId: targetOrg,
      status: 'Approved',
      score: 100,
      submittedBy: 'Workspace Administrator',
      timestamp: 'Just now',
      violationsCount: 0
    };

    setData(prev => {
      const existing = (prev.logoAssets || []).map(l => {
        if (shouldBePrimary && matchesOrganisation(l.organisation, targetOrg)) {
          return { ...l, isPrimary: false };
        }
        return l;
      });

      return {
        ...prev,
        logoAssets: [newLogo, ...existing],
        activities: [newActivity, ...prev.activities],
        organisations: Array.from(new Set([...(prev.organisations || defaultOrgs), targetOrg]))
      };
    });

    addNotification({
      type: 'success',
      title: 'Master Logo Approved',
      desc: `Registered ${newLogo.name} for ${targetOrg} visual verification.`
    });

    return newLogo;
  };

  const deleteLogoAsset = (id) => {
    setData(prev => {
      const logoToDelete = (prev.logoAssets || []).find(l => l.id === id);
      const remaining = (prev.logoAssets || []).filter(l => l.id !== id);

      if (logoToDelete && logoToDelete.isPrimary) {
        const nextForOrg = remaining.find(l => matchesOrganisation(l.organisation, logoToDelete.organisation));
        if (nextForOrg) {
          nextForOrg.isPrimary = true;
        }
      }

      const newActivity = logoToDelete ? {
        id: `act-${Date.now()}`,
        title: `Removed Logo Asset: ${logoToDelete.name}`,
        type: 'Brand Asset Removal',
        department: 'Brand Hub',
        organisationId: logoToDelete.organisation,
        status: 'Approved',
        score: 100,
        submittedBy: 'Workspace Administrator',
        timestamp: 'Just now',
        violationsCount: 0
      } : null;

      return {
        ...prev,
        logoAssets: remaining,
        activities: newActivity ? [newActivity, ...prev.activities] : prev.activities
      };
    });
  };

  const setPrimaryLogoAsset = (id) => {
    setData(prev => {
      const targetLogo = (prev.logoAssets || []).find(l => l.id === id);
      if (!targetLogo) return prev;
      const targetOrg = targetLogo.organisation;

      const updated = (prev.logoAssets || []).map(l => {
        if (matchesOrganisation(l.organisation, targetOrg)) {
          return { ...l, isPrimary: l.id === id };
        }
        return l;
      });

      return {
        ...prev,
        logoAssets: updated
      };
    });
  };

  const setSelectedOrganisation = (org) => {
    setData(prev => ({
      ...prev,
      selectedOrganisation: org
    }));
  };

  const addOrganisation = (name) => {
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    setData(prev => ({
      ...prev,
      organisations: Array.from(new Set([...(prev.organisations || defaultOrgs), trimmed])),
      selectedOrganisation: trimmed
    }));
  };

  const clearAllData = () => {
    const emptyState = {
      uploadedDocuments: [],
      manualGuidelines: [],
      reviews: [],
      activities: [],
      notifications: [],
      colorTokens: [],
      logoAssets: getDefaultLogoAssets(),
      organisations: defaultOrgs,
      settings: {
        sensitivity: 85,
        autoApprove: false,
        notifySlack: false,
        notifyEmail: false,
        slackChannel: '',
        adminEmail: ''
      },
      selectedOrganisation: defaultOrgs[0]
    };
    setData(emptyState);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <BrandGuardContext.Provider
      value={{
        guidelines: orgGuidelines,
        uploadedDocuments: orgUploadedDocuments,
        manualGuidelines: orgManualGuidelines,
        reviews: orgReviews,
        activities: orgActivities,
        notifications: orgNotifications,
        allNotifications: data.notifications || [],
        colorTokens: orgColorTokens,
        allColorTokens: data.colorTokens,
        settings: data.settings,
        selectedOrganisation: currentOrg,
        setSelectedOrganisation,
        organisations,
        addOrganisation,
        allGuidelines,
        allReviews: data.reviews,
        allUploadedDocuments: data.uploadedDocuments,
        allManualGuidelines: data.manualGuidelines,
        metrics,
        violationCategories,
        departmentScores,
        channelAudits,
        addUploadedDocument,
        deleteUploadedDocument,
        addManualGuideline,
        updateManualGuideline,
        deleteManualGuideline,
        currentUser,
        currentUserRole: data.currentUserRole || 'Manager',
        setCurrentUserRole,
        teamMembers: defaultTeamMembers,
        assignReview,
        grantProductionClearance,
        publishApprovedAsset,
        recordPublishingFailure,
        fetchWebhookConfig,
        saveWebhookSettings,
        testWebhookEndpoint,
        fetchWordPressConfig,
        connectWordPress,
        disconnectWordPress,
        fetchSlackConfig,
        connectSlack,
        testSlackNotification,
        disconnectSlack,
        dispatchSlackNotificationEvent,
        addNotification,
        clearNotifications,
        markNotificationRead,
        addReviewSubmission,
        updateReviewStatus,
        updateReviewWithReanalysis,
        updateSettings,
        addColorToken,
        logoAssets: orgLogoAssets,
        allLogoAssets: data.logoAssets || [],
        primaryOrgLogo,
        addLogoAsset,
        deleteLogoAsset,
        setPrimaryLogoAsset,
        clearAllData
      }}
    >
      {children}
    </BrandGuardContext.Provider>
  );
}

export function useBrandGuard() {
  const context = useContext(BrandGuardContext);
  if (!context) {
    throw new Error('useBrandGuard must be used within a BrandGuardProvider');
  }
  return context;
}
