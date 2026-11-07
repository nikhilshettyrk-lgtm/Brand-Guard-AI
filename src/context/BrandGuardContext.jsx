import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const BrandGuardContext = createContext(null);

const STORAGE_KEY = 'brandguard_app_data_v2';

export const defaultOrgs = ['BrightWave Analytics', 'Northstar Digital'];

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
          organisations: Array.isArray(parsed.organisations) && parsed.organisations.length > 0
            ? Array.from(new Set([...defaultOrgs, ...parsed.organisations]))
            : defaultOrgs,
          settings: parsed.settings || {
            sensitivity: 85,
            autoApprove: false,
            notifySlack: false,
            notifyEmail: false,
            slackChannel: '',
            adminEmail: ''
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
      modelUsed: review.modelUsed || 'gemini-3.5-flash',
      organisationId,
      note: 'Initial Submission'
    };

    const initialAuditEvent = {
      id: `audit-${Date.now()}-1`,
      type: 'submission',
      action: 'Content Submitted & Analyzed',
      actor: review.submittedBy || 'Workspace Administrator',
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
      submissionMode: review.submissionMode || 'text', // 'text' | 'file'
      originalFile: review.originalFile || null,
      originalContent: initialContent,
      currentContent: initialContent,
      extractedText: initialContent,
      organisationId,
      department: review.department || review.contentType || 'Marketing',
      status: review.status || 'Pending Review', // Never automatically approved!
      score: typeof review.score === 'number' ? review.score : 0,
      submittedBy: review.submittedBy || 'Workspace Administrator',
      timestamp: 'Just now',
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      summary: review.summary || '',
      checks: review.checks || [],
      violations: initialFindings,
      findings: initialFindings,
      passedRules: review.passedRules || [],
      riskLevel: (review.score >= 85) ? 'Low' : (review.score >= 70) ? 'Medium' : 'High',
      modelUsed: review.modelUsed || 'gemini-3.5-flash',
      versions: [initialVersion],
      auditTrail: [initialAuditEvent],
      decisionDetails: null
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
      submittedBy: newReview.submittedBy,
      timestamp: 'Just now',
      violationsCount: newReview.violations ? newReview.violations.length : 0,
      issue: newReview.violations && newReview.violations[0] ? newReview.violations[0].explanation || newReview.violations[0].detail : null
    };

    setData(prev => ({
      ...prev,
      reviews: [newReview, ...prev.reviews],
      activities: [newActivity, ...prev.activities],
      organisations: Array.from(new Set([...(prev.organisations || defaultOrgs), organisationId]))
    }));

    return newReview;
  };

  const updateReviewWithReanalysis = (reviewId, updatedData) => {
    setData(prev => {
      const now = new Date();
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
            modelUsed: updatedData.modelUsed || 'gemini-3.5-flash',
            organisationId,
            note: updatedData.note || `Re-analysis (v${nextVersionNum})`
          };

          const reanalysisAuditEvent = {
            id: `audit-${Date.now()}-re`,
            type: 'reanalysis',
            action: `Content Re-analysed (v${nextVersionNum})`,
            actor: 'Workspace Administrator',
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
            modelUsed: updatedData.modelUsed || r.modelUsed,
            riskLevel: (updatedData.score >= 85) ? 'Low' : (updatedData.score >= 70) ? 'Medium' : 'High',
            versions: [...prevVersions, newVersion],
            auditTrail: [...prevAudit, reanalysisAuditEvent]
          };
        }
        return r;
      });

      const target = prev.reviews.find(r => r.id === reviewId);
      const newActivity = target ? {
        id: `act-${Date.now()}`,
        title: `${target.title} Re-analysed (v${(target.versions?.length || 1) + 1})`,
        type: 'Content Re-analysis',
        department: target.department,
        status: updatedData.status || 'Pending Review',
        score: updatedData.score,
        submittedBy: 'Workspace Administrator',
        timestamp: 'Just now',
        violationsCount: updatedData.findings ? updatedData.findings.length : 0,
        issue: updatedData.findings && updatedData.findings[0] ? updatedData.findings[0].explanation || updatedData.findings[0].detail : null
      } : null;

      return {
        ...prev,
        reviews: updatedReviews,
        activities: newActivity ? [newActivity, ...prev.activities] : prev.activities
      };
    });
  };

  const updateReviewStatus = (id, newStatus, reviewerNotes = '', reviewerName = 'Workspace Administrator') => {
    setData(prev => {
      const target = prev.reviews.find(r => r.id === id);
      const organisationId = target?.organisationId || 'Salesforce';
      const now = new Date();

      const decisionDetails = {
        reviewer: reviewerName || 'Workspace Administrator',
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
        actor: reviewerName || 'Workspace Administrator',
        timestamp: now.toISOString(),
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        decision: newStatus,
        comments: reviewerNotes || '',
        score: target ? target.score : 0,
        organisationId,
        submissionId: id
      };

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
        submittedBy: reviewerName || 'Workspace Administrator',
        timestamp: 'Just now',
        violationsCount: target.violations ? target.violations.length : 0,
        issue: reviewerNotes ? `Decision Note: ${reviewerNotes}` : null
      } : null;

      return {
        ...prev,
        reviews: updatedReviews,
        activities: newActivity ? [newActivity, ...prev.activities] : prev.activities
      };
    });
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
        notifications: data.notifications,
        colorTokens: data.colorTokens,
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
        addReviewSubmission,
        updateReviewStatus,
        updateReviewWithReanalysis,
        updateSettings,
        addColorToken,
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
