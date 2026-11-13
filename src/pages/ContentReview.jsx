import React, { useState, useRef, useEffect } from 'react';
import {
  ScanLine,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Sparkles,
  Eye,
  Trash2,
  Check,
  CheckCheck,
  X,
  RotateCcw,
  History,
  Image as ImageIcon,
  Loader2,
  ArrowRight,
  Info,
  PenTool,
  Copy,
  FileUp,
  RefreshCw,
  Edit3,
  ShieldCheck,
  UserCheck,
  Clock,
  Send,
  Palette,
  Layout,
  Sliders,
  Type,
  Maximize2,
  Share2,
  Printer,
  Download,
  Users,
  ExternalLink
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';
import { extractTextFromFile } from '../utils/documentExtractor';
import { analyzeContentCompliance } from '../services/analysisEngine';

export default function ContentReview() {
  const {
    guidelines,
    uploadedDocuments,
    manualGuidelines,
    reviews,
    addReviewSubmission,
    updateReviewStatus,
    updateReviewWithReanalysis,
    settings,
    selectedOrganisation,
    colorTokens,
    teamMembers,
    assignReview,
    currentUser,
    currentUserRole,
    publishApprovedAsset,
    primaryOrgLogo,
    logoAssets
  } = useBrandGuard();

  // 1. THREE INPUT TABS: 'text' | 'document' | 'image'
  const [activeTab, setActiveTab] = useState('text');

  // Common Form Metadata
  const [contentCategory, setContentCategory] = useState('Marketing Copy');

  // Tab A: Write / Paste Text State
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  // Tab B: Upload Documents State (PDF, DOCX, TXT)
  const docInputRef = useRef(null);
  const [docTitle, setDocTitle] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [extractedDocText, setExtractedDocText] = useState('');
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [docProgress, setDocProgress] = useState('');
  const [docError, setDocError] = useState('');
  const [isDocDragOver, setIsDocDragOver] = useState(false);

  // Tab C: Upload Images State (PNG, JPG, JPEG, WEBP)
  const imageInputRef = useRef(null);
  const [imageTitle, setImageTitle] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [extractedImageText, setExtractedImageText] = useState('');
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState('');
  const [imageError, setImageError] = useState('');
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [zoomModalImage, setZoomModalImage] = useState(null);

  // Shared Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisSuccess, setAnalysisSuccess] = useState('');

  // Active Review Item for Inspector
  const [selectedReviewId, setSelectedReviewId] = useState(reviews[0]?.id || null);
  const [reviewerIdentity, setReviewerIdentity] = useState('Workspace Administrator');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [decisionFeedback, setDecisionFeedback] = useState(null);
  const [decisionError, setDecisionError] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState('Custom Webhooks');
  const [publishIsSimulation, setPublishIsSimulation] = useState(true);
  const [publishNotes, setPublishNotes] = useState('');
  const [publishFeedback, setPublishFeedback] = useState(null);
  const [wpPostStatus, setWpPostStatus] = useState('draft');
  const [isPublishing, setIsPublishing] = useState(false);
  const [assignmentFeedback, setAssignmentFeedback] = useState('');

  // Synchronize selected review when reviews change (e.g. organization switch)
  useEffect(() => {
    if (reviews.length > 0 && !reviews.some(r => r.id === selectedReviewId)) {
      setSelectedReviewId(reviews[0].id);
    } else if (reviews.length === 0) {
      setSelectedReviewId(null);
    }
  }, [reviews, selectedReviewId]);

  // Content Correction, Editor & Re-Analysis States
  const [editableContent, setEditableContent] = useState('');
  const [customReplacements, setCustomReplacements] = useState({});
  const [editingReplacementIdx, setEditingReplacementIdx] = useState(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
  const [rejectedSuggestions, setRejectedSuggestions] = useState({});
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalysisSuccess, setReanalysisSuccess] = useState('');
  const [reanalysisError, setReanalysisError] = useState('');
  const [selectedVersionNum, setSelectedVersionNum] = useState(null);

  const activeReview = reviews.find(r => r.id === selectedReviewId) || reviews[0] || null;

  // Sync working editor copy when selected review changes
  useEffect(() => {
    if (activeReview) {
      setEditableContent(activeReview.currentContent || activeReview.extractedText || '');
      setCustomReplacements({});
      setEditingReplacementIdx(null);
      setAcceptedSuggestions({});
      setRejectedSuggestions({});
      setReanalysisSuccess('');
      setReanalysisError('');
      setSelectedVersionNum(activeReview.versions?.length || 1);
      setReviewerNotes(activeReview.decisionDetails?.comments || activeReview.reviewerNotes || '');
      setDecisionError('');
      setShowApprovalModal(false);
    }
  }, [activeReview?.id]);

  // Content Categories required by specification
  const contentCategories = [
    'Social Media Post',
    'Marketing Copy',
    'Advertisement',
    'Blog Article',
    'Email Campaign',
    'General Content'
  ];

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // --- DOCUMENT UPLOAD & EXTRACTION (PDF, DOCX, TXT) ---

  const handleDocumentFile = async (file) => {
    if (!file) return;

    setDocError('');
    setAnalysisError('');
    setSelectedDoc(null);
    setExtractedDocText('');

    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    // File type validation
    if (!allowedExtensions.includes(fileExt)) {
      setDocError(`Unsupported format "${fileExt}". Please upload a PDF, DOCX, or TXT document.`);
      return;
    }

    // File size validation (25MB limit)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setDocError(`Document size (${formatFileSize(file.size)}) exceeds the 25MB limit.`);
      return;
    }

    // Handle empty file
    if (file.size === 0) {
      setDocError('The uploaded file is empty (0 bytes). Please upload a valid document.');
      return;
    }

    setSelectedDoc(file);
    if (!docTitle.trim()) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setDocTitle(baseName.replace(/[-_]/g, ' '));
    }

    setIsExtractingDoc(true);
    setDocProgress(`Parsing ${file.name}...`);

    try {
      const extraction = await extractTextFromFile(file, (pct, status) => {
        setDocProgress(status);
      });
      setExtractedDocText(extraction.text);
      setDocProgress('');
    } catch (err) {
      setDocError(err.message || 'Failed to extract text from document.');
      setExtractedDocText('');
    } finally {
      setIsExtractingDoc(false);
    }
  };

  const handleRemoveDoc = () => {
    setSelectedDoc(null);
    setExtractedDocText('');
    setDocError('');
    setDocProgress('');
    if (docInputRef.current) docInputRef.current.value = '';
  };

  // --- IMAGE UPLOAD & OCR EXTRACTION (PNG, JPG, JPEG) ---

  const handleImageFile = async (file) => {
    if (!file) return;

    setImageError('');
    setAnalysisError('');
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setExtractedImageText('');

    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    // File type validation
    if (!allowedExtensions.includes(fileExt)) {
      setImageError(`Unsupported image format "${fileExt}". Please upload a PNG, JPG, JPEG, or WEBP image.`);
      return;
    }

    // File size validation (20MB limit)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setImageError(`Image size (${formatFileSize(file.size)}) exceeds the 20MB limit.`);
      return;
    }

    // Handle empty file
    if (file.size === 0) {
      setImageError('The uploaded image file is empty (0 bytes).');
      return;
    }

    setSelectedImage(file);

    // Create persistent Data URL preview for image visual analysis and Gemini multimodal integration
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);

    if (!imageTitle.trim()) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setImageTitle(baseName.replace(/[-_]/g, ' '));
    }

    setIsExtractingImage(true);
    setImageProgress(`Scanning visible copy in ${file.name}...`);

    try {
      const extraction = await extractTextFromFile(file, (pct, status) => {
        setImageProgress(status);
      });
      setExtractedImageText(extraction.text || '');
      setImageProgress('');
    } catch (err) {
      // Non-blocking: images with zero text or artistic graphics are still analyzed via Gemini multimodal
      console.warn('OCR note:', err.message);
      setExtractedImageText('');
      setImageProgress('');
    } finally {
      setIsExtractingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setExtractedImageText('');
    setImageError('');
    setImageProgress('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // --- COMMON SUBMISSION WORKFLOW ---

  const executeAnalysis = async ({ title, category, text, submissionMode, originalFile, imagePreview, imageData }) => {
    setAnalysisError('');
    setAnalysisSuccess('');

    if (!title.trim()) {
      setAnalysisError('Please enter a content title.');
      return;
    }

    if ((!text || !text.trim()) && !imageData) {
      setAnalysisError('No readable text content or visual image asset provided for compliance checking.');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Run compliance analysis against actual saved guidelines and visual palette
      const approvedLogoPayload = primaryOrgLogo ? {
        id: primaryOrgLogo.id,
        name: primaryOrgLogo.name,
        variant: primaryOrgLogo.variant,
        fileType: primaryOrgLogo.fileType,
        mimeType: primaryOrgLogo.mimeType || 'image/png',
        base64: primaryOrgLogo.pngBase64 || (primaryOrgLogo.previewUrl ? primaryOrgLogo.previewUrl.replace(/^data:[^;]+;base64,/, '') : '')
      } : null;

      const analysisResult = await analyzeContentCompliance({
        content: (text || '').trim(),
        title: title.trim(),
        contentType: category,
        guidelines: manualGuidelines,
        uploadedDocuments: uploadedDocuments,
        sensitivityThreshold: settings.sensitivity || 85,
        imageData: imageData || null,
        colorTokens: colorTokens || [],
        approvedLogoData: approvedLogoPayload
      });

      // Save submission and associate analysis results
      const newSubmission = addReviewSubmission({
        title: title.trim(),
        contentType: category,
        submissionMode: submissionMode, // 'text' | 'document' | 'image'
        originalFile: originalFile ? {
          name: originalFile.name,
          size: formatFileSize(originalFile.size),
          fileType: originalFile.name.substring(originalFile.name.lastIndexOf('.')).toUpperCase().replace('.', ''),
          previewUrl: imagePreview || null
        } : null,
        approvedLogoUsed: primaryOrgLogo ? {
          id: primaryOrgLogo.id,
          name: primaryOrgLogo.name,
          variant: primaryOrgLogo.variant,
          fileType: primaryOrgLogo.fileType,
          previewUrl: primaryOrgLogo.previewUrl
        } : null,
        extractedText: (text || '').trim(),
        organisationId: selectedOrganisation,
        submittedBy: currentUser?.name || 'Maya Patel',
        actorRole: currentUserRole || 'Creator',
        department: category,
        status: analysisResult.status || 'Pending Review',
        score: analysisResult.score !== null ? analysisResult.score : 0,
        summary: analysisResult.summary,
        checks: analysisResult.checks,
        violations: analysisResult.findings || analysisResult.violations || [],
        findings: analysisResult.findings || analysisResult.violations || [],
        modelUsed: analysisResult.modelUsed || 'gemini-3.5-flash',
        visualAnalysis: analysisResult.visualAnalysis || null
      });

      setSelectedReviewId(newSubmission.id);
      setAnalysisSuccess(`Analysis completed via ${analysisResult.modelUsed || 'Gemini'}! Score: ${analysisResult.score !== null ? analysisResult.score + '%' : 'Unverified'} (Status: ${analysisResult.status || 'Pending Review'})`);

      // Reset specific submission input
      if (submissionMode === 'text') {
        setTextTitle('');
        setTextContent('');
      } else if (submissionMode === 'document') {
        setDocTitle('');
        handleRemoveDoc();
      } else if (submissionMode === 'image') {
        setImageTitle('');
        handleRemoveImage();
      }
    } catch (err) {
      setAnalysisError(err.message || 'An error occurred during content review analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler for Tab A: Text
  const handleTextSubmit = (e) => {
    e.preventDefault();
    executeAnalysis({
      title: textTitle,
      category: contentCategory,
      text: textContent,
      submissionMode: 'text',
      originalFile: null,
      imagePreview: null
    });
  };

  // Handler for Tab B: Document
  const handleDocSubmit = (e) => {
    e.preventDefault();
    if (!selectedDoc) {
      setDocError('Please upload a PDF, DOCX, or TXT file first.');
      return;
    }
    if (isExtractingDoc) {
      setAnalysisError('Please wait for document text extraction to complete.');
      return;
    }
    if (!extractedDocText.trim()) {
      setDocError('Cannot analyze: No readable text extracted from document.');
      return;
    }

    executeAnalysis({
      title: docTitle || selectedDoc.name,
      category: contentCategory,
      text: extractedDocText,
      submissionMode: 'document',
      originalFile: selectedDoc,
      imagePreview: null
    });
  };

  // Handler for Tab C: Image
  const handleImageSubmit = (e) => {
    e.preventDefault();
    if (!selectedImage) {
      setImageError('Please upload a PNG, JPG, JPEG, or WEBP image first.');
      return;
    }
    if (isExtractingImage) {
      setAnalysisError('Please wait for image OCR extraction to complete.');
      return;
    }

    // Determine MIME type
    let mimeType = selectedImage.type;
    if (!mimeType) {
      const ext = selectedImage.name.substring(selectedImage.name.lastIndexOf('.')).toLowerCase();
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else mimeType = 'image/jpeg';
    }

    const cleanBase64 = imagePreviewUrl ? imagePreviewUrl.replace(/^data:[^;]+;base64,/, '') : null;
    const imageData = cleanBase64 ? { mimeType, base64: cleanBase64 } : null;

    executeAnalysis({
      title: imageTitle || selectedImage.name,
      category: contentCategory,
      text: extractedImageText || `[Visual Creative Asset: ${selectedImage.name}]`,
      submissionMode: 'image',
      originalFile: selectedImage,
      imagePreview: imagePreviewUrl,
      imageData: imageData
    });
  };

  // --- CONTENT CORRECTION & RE-ANALYSIS WORKFLOW HANDLERS ---

  const handleAcceptSuggestion = (idx, finding) => {
    const targetText = finding.problematicText || '';
    const replacementText = customReplacements[idx] !== undefined
      ? customReplacements[idx]
      : (finding.suggestedCorrection || '');

    if (!replacementText) return;

    let updated = editableContent;

    // Handle omission/footer notice
    if (targetText.startsWith('[') && targetText.endsWith(']')) {
      const cleanFooter = replacementText
        .replace(/^Add footnote:\s*/i, '')
        .replace(/^Include the following notice in the footer:\s*/i, '')
        .replace(/['"]/g, '')
        .trim();
      if (!updated.includes(cleanFooter)) {
        updated = updated.trim() + '\n\n' + cleanFooter;
      }
    } else if (updated.includes(targetText)) {
      updated = updated.replace(targetText, replacementText);
    } else {
      // Normalize quotes for robust matching
      const normalizeQuotes = (str) => str.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      const normCurrent = normalizeQuotes(updated);
      const normTarget = normalizeQuotes(targetText);
      const matchPos = normCurrent.indexOf(normTarget);
      if (matchPos !== -1) {
        updated = updated.slice(0, matchPos) + replacementText + updated.slice(matchPos + targetText.length);
      } else {
        const escaped = targetText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(escaped, 'i');
        if (reg.test(updated)) {
          updated = updated.replace(reg, replacementText);
        } else {
          updated = updated + '\n\n' + replacementText;
        }
      }
    }

    setEditableContent(updated);
    setAcceptedSuggestions(prev => ({ ...prev, [idx]: true }));
    setRejectedSuggestions(prev => ({ ...prev, [idx]: false }));
    setEditingReplacementIdx(null);
  };

  const handleRejectSuggestion = (idx) => {
    setRejectedSuggestions(prev => ({ ...prev, [idx]: true }));
    setAcceptedSuggestions(prev => ({ ...prev, [idx]: false }));
    setEditingReplacementIdx(null);
  };

  const handleApplyAllSuggestions = () => {
    if (!activeReview?.violations || activeReview.violations.length === 0) return;
    let updated = editableContent;
    const newAccepted = { ...acceptedSuggestions };

    activeReview.violations.forEach((finding, idx) => {
      if (rejectedSuggestions[idx]) return; // Skip rejected ones
      const targetText = finding.problematicText || '';
      const replacementText = customReplacements[idx] !== undefined
        ? customReplacements[idx]
        : (finding.suggestedCorrection || '');

      if (!replacementText) return;

      if (targetText.startsWith('[') && targetText.endsWith(']')) {
        const cleanFooter = replacementText
          .replace(/^Add footnote:\s*/i, '')
          .replace(/^Include the following notice in the footer:\s*/i, '')
          .replace(/['"]/g, '')
          .trim();
        if (!updated.includes(cleanFooter)) {
          updated = updated.trim() + '\n\n' + cleanFooter;
        }
        newAccepted[idx] = true;
      } else if (updated.includes(targetText)) {
        updated = updated.replace(targetText, replacementText);
        newAccepted[idx] = true;
      } else {
        const normalizeQuotes = (str) => str.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
        const normCurrent = normalizeQuotes(updated);
        const normTarget = normalizeQuotes(targetText);
        const matchPos = normCurrent.indexOf(normTarget);
        if (matchPos !== -1) {
          updated = updated.slice(0, matchPos) + replacementText + updated.slice(matchPos + targetText.length);
          newAccepted[idx] = true;
        }
      }
    });

    setEditableContent(updated);
    setAcceptedSuggestions(newAccepted);
  };

  const handleResetToOriginal = () => {
    if (activeReview) {
      setEditableContent(activeReview.originalContent || activeReview.extractedText || '');
      setAcceptedSuggestions({});
      setRejectedSuggestions({});
      setCustomReplacements({});
      setReanalysisSuccess('Reset working copy to original submitted content.');
      setTimeout(() => setReanalysisSuccess(''), 3000);
    }
  };

  const handleReanalyze = async () => {
    if (!editableContent.trim() && !activeReview?.originalFile?.previewUrl) {
      setReanalysisError('Cannot re-analyse empty content.');
      return;
    }
    setIsReanalyzing(true);
    setReanalysisError('');
    setReanalysisSuccess('');

    try {
      let imageData = null;
      if (activeReview?.submissionMode === 'image' && activeReview.originalFile?.previewUrl) {
        const previewUrl = activeReview.originalFile.previewUrl;
        const mimeMatch = previewUrl.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const cleanBase64 = previewUrl.replace(/^data:[^;]+;base64,/, '');
        imageData = { mimeType, base64: cleanBase64 };
      }

      const analysisResult = await analyzeContentCompliance({
        content: (editableContent || '').trim(),
        title: activeReview.title,
        contentType: activeReview.contentType,
        guidelines: manualGuidelines,
        uploadedDocuments: uploadedDocuments,
        sensitivityThreshold: settings.sensitivity || 85,
        imageData: imageData,
        colorTokens: colorTokens || []
      });

      const nextVer = (activeReview.versions?.length || 1) + 1;
      updateReviewWithReanalysis(activeReview.id, {
        content: (editableContent || '').trim(),
        score: analysisResult.score !== null ? analysisResult.score : 0,
        status: analysisResult.status || 'Pending Review', // Never automatically approved!
        summary: analysisResult.summary,
        findings: analysisResult.findings || analysisResult.violations || [],
        violations: analysisResult.findings || analysisResult.violations || [],
        checks: analysisResult.checks || [],
        modelUsed: analysisResult.modelUsed || 'gemini-3.5-flash',
        organisationId: activeReview.organisationId || selectedOrganisation,
        visualAnalysis: analysisResult.visualAnalysis || activeReview.visualAnalysis || null,
        note: `Re-analysis (v${nextVer})`
      });

      setSelectedVersionNum(nextVer);
      setAcceptedSuggestions({});
      setRejectedSuggestions({});
      setCustomReplacements({});

      setReanalysisSuccess(`Re-analysis complete via ${analysisResult.modelUsed || 'Gemini'}! Score: ${analysisResult.score}% (${analysisResult.status || 'Pending Review'}). Remaining issues: ${analysisResult.findings?.length || 0}`);
    } catch (err) {
      setReanalysisError(err.message || 'Re-analysis failed.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleSelectVersion = (v) => {
    setSelectedVersionNum(v.version);
    setEditableContent(v.content);
    setReanalysisSuccess(`Loaded Version ${v.version} (${v.score}% score) into inspector.`);
    setTimeout(() => setReanalysisSuccess(''), 3500);
  };

  // Human Review & Approval Decision Handlers
  const handleInitiateApprove = () => {
    setDecisionError('');
    setShowApprovalModal(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedReviewId) return;
    if (currentUserRole === 'Creator') {
      setDecisionError('Access Denied: Creator role cannot approve submissions.');
      return;
    }
    updateReviewStatus(
      selectedReviewId,
      'Approved',
      reviewerNotes.trim() || 'Approved after human compliance review.',
      reviewerIdentity.trim() || currentUser?.name || 'Workspace Administrator',
      currentUserRole
    );
    setShowApprovalModal(false);
    setDecisionFeedback('Asset marked as: Approved');
    setTimeout(() => setDecisionFeedback(null), 3000);
  };

  const handleRequestRevisions = () => {
    setDecisionError('');
    if (currentUserRole === 'Creator') {
      setDecisionError('Access Denied: Creator role cannot request revisions.');
      return;
    }
    if (!reviewerNotes.trim()) {
      setDecisionError('Review comments are strictly required when requesting revisions to specify what changes the creator must make.');
      return;
    }
    updateReviewStatus(
      selectedReviewId,
      'Changes Requested',
      reviewerNotes.trim(),
      reviewerIdentity.trim() || currentUser?.name || 'Workspace Administrator',
      currentUserRole
    );
    setDecisionFeedback('Asset returned to creator: Changes Requested');
    setTimeout(() => setDecisionFeedback(null), 3000);
  };

  const handleReject = () => {
    setDecisionError('');
    if (currentUserRole === 'Creator') {
      setDecisionError('Access Denied: Creator role cannot reject submissions.');
      return;
    }
    if (!reviewerNotes.trim()) {
      setDecisionError('Review comments are strictly required when rejecting content to explain the policy or brand conflict.');
      return;
    }
    updateReviewStatus(
      selectedReviewId,
      'Rejected',
      reviewerNotes.trim(),
      reviewerIdentity.trim() || currentUser?.name || 'Workspace Administrator',
      currentUserRole
    );
    setDecisionFeedback('Asset marked as: Rejected');
    setTimeout(() => setDecisionFeedback(null), 3000);
  };

  const handleAssignReviewer = (assignee) => {
    if (!activeReview || !assignee) return;
    if (currentUserRole !== 'Manager') {
      setAssignmentFeedback('Access Denied: Only Managers can assign review ownership.');
      setTimeout(() => setAssignmentFeedback(''), 3000);
      return;
    }
    assignReview(activeReview.id, assignee, currentUser?.name);
    setAssignmentFeedback(`Assigned ownership to ${assignee}`);
    setTimeout(() => setAssignmentFeedback(''), 3000);
  };

  const handlePublishAsset = async () => {
    if (!activeReview) return;
    if (currentUserRole !== 'Manager') {
      setPublishFeedback({
        error: true,
        message: 'Access Denied: Only authorized Managers can dispatch and publish collateral.'
      });
      return;
    }
    if (!activeReview.productionClearance) {
      setPublishFeedback({
        error: true,
        message: 'Production Clearance Required: Content must receive final Manager clearance before external dispatch.'
      });
      return;
    }

    setIsPublishing(true);
    setPublishFeedback(null);
    try {
      const res = await publishApprovedAsset(activeReview.id, publishPlatform, {
        isSimulation: publishIsSimulation,
        notes: publishNotes.trim(),
        postStatus: wpPostStatus
      });

      if (res && res.success) {
        setPublishFeedback({
          error: false,
          message: res.message + (res.post?.url ? ` Link: ${res.post.url}` : '')
        });
        setTimeout(() => {
          setPublishFeedback(null);
          setShowPublishModal(false);
          setPublishNotes('');
        }, 3000);
      } else {
        setPublishFeedback({
          error: true,
          message: res?.message || 'Publishing failed. Live connection unavailable or authentication required.'
        });
      }
    } catch (err) {
      setPublishFeedback({
        error: true,
        message: err.message || 'Publishing error.'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Governance Audit Trail computation
  const auditEvents = (activeReview?.auditTrail && activeReview.auditTrail.length > 0)
    ? activeReview.auditTrail
    : (activeReview ? [
        {
          id: 'initial',
          type: 'submission',
          action: 'Content Submitted & Analyzed',
          actor: activeReview.submittedBy || 'Workspace Administrator',
          formattedDate: activeReview.date || 'Initial',
          formattedTime: '10:00 AM',
          score: activeReview.score,
          status: activeReview.status || 'Pending Review',
          comments: `Evaluated via ${activeReview.modelUsed || 'gemini-3.5-flash'}`,
          organisationId: activeReview.organisationId || 'Salesforce',
          submissionId: activeReview.id
        },
        ...(activeReview.decisionDetails ? [{
          id: 'decision-1',
          type: 'decision',
          action: `Reviewer Decision: ${activeReview.decisionDetails.decision}`,
          actor: activeReview.decisionDetails.reviewer,
          formattedDate: activeReview.decisionDetails.formattedDate,
          formattedTime: activeReview.decisionDetails.formattedTime,
          status: activeReview.decisionDetails.decision,
          comments: activeReview.decisionDetails.comments,
          score: activeReview.score,
          organisationId: activeReview.organisationId || 'Salesforce',
          submissionId: activeReview.id
        }] : [])
      ] : []);

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-16">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={docInputRef}
        onChange={(e) => handleDocumentFile(e.target.files?.[0])}
        accept=".pdf,.docx,.txt"
        className="hidden"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleImageFile(e.target.files?.[0])}
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
      />

      {/* Top Banner */}
      <div className="neu-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              Content Compliance Studio
            </span>
            <span className="text-xs text-[#8A99AD] font-medium">
              Multi-Source Review Ingestion
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#202B45] tracking-tight">
            Content Review & Validation
          </h2>
          <p className="text-xs md:text-sm text-[#5E6E82] font-medium mt-1">
            Submit content through text copy, documents (PDF, DOCX, TXT), or visual assets (PNG, JPG) for compliance evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-bold text-[#5E6E82]">Active Brand Guidelines:</span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#047857]">
            {guidelines.length} Available
          </span>
        </div>
      </div>

      {/* CONTENT INPUT SECTION (THREE OPTIONS) */}
      <div className="neu-card p-6 md:p-8 space-y-6">
        {/* Header & 3 Prominent Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D5DDE7]/70">
          <div>
            <h3 className="text-lg font-bold text-[#202B45]">
              Submit Content for Review
            </h3>
            <p className="text-xs text-[#5E6E82] mt-0.5">
              Choose an input method: write copy, upload document rulebooks/collateral, or scan imagery.
            </p>
          </div>

          {/* 1. THREE CLEARLY VISIBLE TABS */}
          <div className="flex items-center gap-2 flex-wrap neu-card-sm p-1.5 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('text');
                setAnalysisError('');
              }}
              className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'text'
                  ? 'neu-active text-[#536DFE] shadow-sm'
                  : 'text-[#5E6E82] hover:text-[#202B45]'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Write or Paste Text
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('document');
                setAnalysisError('');
              }}
              className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'document'
                  ? 'neu-active text-[#536DFE] shadow-sm'
                  : 'text-[#5E6E82] hover:text-[#202B45]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Upload Documents
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('image');
                setAnalysisError('');
              }}
              className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'image'
                  ? 'neu-active text-[#536DFE] shadow-sm'
                  : 'text-[#5E6E82] hover:text-[#202B45]'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Upload Images
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {analysisError && (
          <div className="neu-card-sm p-3.5 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        {analysisSuccess && (
          <div className="neu-card-sm p-3.5 bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{analysisSuccess}</span>
          </div>
        )}

        {/* Shared Category Selector (Applies to all submission modes) */}
        <div className="max-w-xs">
          <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
            Content Category *
          </label>
          <select
            value={contentCategory}
            onChange={(e) => setContentCategory(e.target.value)}
            className="neu-input w-full px-3.5 py-2 text-xs text-[#202B45] cursor-pointer"
          >
            {contentCategories.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* ============================================================== */}
        {/* OPTION A: WRITE OR PASTE TEXT                                  */}
        {/* ============================================================== */}
        {activeTab === 'text' && (
          <form onSubmit={handleTextSubmit} className="space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                Content Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Q3 Global Product Announcement Headline"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="neu-input w-full px-4 py-2.5 text-xs text-[#202B45]"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                Content Body Copy *
              </label>
              <textarea
                rows={9}
                placeholder="Write or paste marketing copy, email message, press statement, or campaign text here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="neu-input w-full p-4 text-xs md:text-sm resize-y font-normal leading-relaxed text-[#202B45]"
                required
              />
              <div className="flex items-center justify-between text-[11px] text-[#8A99AD] mt-1.5">
                <span>
                  {textContent.length} characters • {textContent.trim() ? textContent.trim().split(/\s+/).length : 0} words
                </span>
                <span>Evaluating against {guidelines.length} active guidelines</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#D5DDE7]/70">
              <span className="text-xs text-[#8A99AD] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Evaluates tone, prohibited terminology, and restricted claims against saved guidelines.
              </span>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="neu-btn-primary px-6 py-2.5 text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-sm self-end sm:self-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyse Content
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* OPTION B: UPLOAD DOCUMENTS (PDF, DOCX, TXT)                     */}
        {/* ============================================================== */}
        {activeTab === 'document' && (
          <form onSubmit={handleDocSubmit} className="space-y-5 animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                Document Title
              </label>
              <input
                type="text"
                placeholder="Auto-fills from file name, or customize title"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="neu-input w-full px-4 py-2.5 text-xs text-[#202B45]"
              />
            </div>

            {/* Document Drag-and-Drop Area */}
            <div>
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                Upload Document (PDF, DOCX, TXT) *
              </label>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDocDragOver(true); }}
                onDragLeave={() => setIsDocDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDocDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleDocumentFile(file);
                }}
                className={`p-7 rounded-2xl border-2 border-dashed transition-all text-center ${
                  isDocDragOver
                    ? 'border-[#536DFE] bg-[#536DFE]/5'
                    : selectedDoc
                    ? 'border-[#10B981] bg-[#10B981]/5'
                    : 'border-[#BCC5D4] bg-[#E8ECF3] neu-input'
                }`}
              >
                {selectedDoc ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white neu-card-sm flex items-center justify-center text-[#10B981]">
                      <FileText className="w-6 h-6" />
                    </div>

                    <div>
                      <h4 className="text-sm md:text-base font-bold text-[#202B45]">{selectedDoc.name}</h4>
                      <p className="text-xs text-[#8A99AD] mt-0.5">
                        {formatFileSize(selectedDoc.size)} • {selectedDoc.name.substring(selectedDoc.name.lastIndexOf('.')).toUpperCase().replace('.', '')} Document
                      </p>
                    </div>

                    {/* Extraction Progress */}
                    {isExtractingDoc && (
                      <div className="p-2.5 bg-white/70 rounded-xl neu-card-sm inline-flex items-center gap-2 text-xs font-semibold text-[#536DFE]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#536DFE]" />
                        <span>{docProgress || 'Parsing document text...'}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        className="neu-btn px-3.5 py-1.5 text-xs font-bold text-[#536DFE] hover:text-[#4258E8] flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Replace Document
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveDoc}
                        className="neu-btn px-3.5 py-1.5 text-xs font-bold text-[#EF4444] hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#536DFE]">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#202B45]">
                        Drag and drop your document here, or browse
                      </h4>
                      <p className="text-xs text-[#8A99AD] mt-0.5">
                        Supported formats: <strong>PDF, DOCX, TXT</strong> (max 25MB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="neu-btn px-4 py-2 text-xs font-bold text-[#202B45] hover:text-[#536DFE] inline-flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-4 h-4 text-[#536DFE]" />
                      Browse Documents
                    </button>
                  </div>
                )}
              </div>

              {/* Document Error Display */}
              {docError && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{docError}</span>
                </div>
              )}
            </div>

            {/* CONTENT PREVIEW & EDITABLE EXTRACTED TEXT */}
            {selectedDoc && !isExtractingDoc && extractedDocText && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    Extracted Document Content ({extractedDocText.trim().split(/\s+/).length} words)
                  </span>
                  <span className="text-[10px] text-[#536DFE] font-semibold flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    Editable before submission
                  </span>
                </div>

                <textarea
                  rows={7}
                  value={extractedDocText}
                  onChange={(e) => setExtractedDocText(e.target.value)}
                  className="neu-input w-full p-4 text-xs md:text-sm font-normal leading-relaxed text-[#202B45] resize-y"
                  placeholder="Extracted document text..."
                />
                <p className="text-[10px] text-[#8A99AD]">
                  Review and edit the extracted copy above to ensure accuracy before running compliance verification.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#D5DDE7]/70">
              <span className="text-xs text-[#8A99AD] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                PDF and DOCX text structures are parsed directly without remote transmission.
              </span>

              <button
                type="submit"
                disabled={isAnalyzing || isExtractingDoc || !selectedDoc || !extractedDocText.trim()}
                className={`neu-btn-primary px-6 py-2.5 text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-sm self-end sm:self-auto ${
                  (!selectedDoc || !extractedDocText.trim() || isExtractingDoc) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Document...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyse Uploaded Document
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* OPTION C: UPLOAD IMAGES (PNG, JPG, JPEG, WEBP)                  */}
        {/* ============================================================== */}
        {activeTab === 'image' && (
          <form onSubmit={handleImageSubmit} className="space-y-5 animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                Image Asset Title
              </label>
              <input
                type="text"
                placeholder="Auto-fills from file name, or customize title"
                value={imageTitle}
                onChange={(e) => setImageTitle(e.target.value)}
                className="neu-input w-full px-4 py-2.5 text-xs text-[#202B45]"
              />
            </div>

            {/* Image Drag-and-Drop Area */}
            <div>
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                Upload an image, poster, advertisement or social media creative. *
              </label>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsImageDragOver(true); }}
                onDragLeave={() => setIsImageDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsImageDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImageFile(file);
                }}
                className={`p-7 rounded-2xl border-2 border-dashed transition-all text-center ${
                  isImageDragOver
                    ? 'border-[#536DFE] bg-[#536DFE]/5'
                    : selectedImage
                    ? 'border-[#10B981] bg-[#10B981]/5'
                    : 'border-[#BCC5D4] bg-[#E8ECF3] neu-input'
                }`}
              >
                {selectedImage ? (
                  <div className="space-y-4">
                    {/* VISUAL IMAGE PREVIEW */}
                    {imagePreviewUrl && (
                      <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden neu-card-sm border border-white p-2 bg-white/70 group">
                        <img
                          src={imagePreviewUrl}
                          alt="Uploaded asset preview"
                          className="max-h-56 w-full object-contain rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setZoomModalImage(imagePreviewUrl)}
                          className="absolute bottom-4 right-4 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white shadow-md backdrop-blur-sm transition-all"
                          title="Zoom image preview"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm md:text-base font-bold text-[#202B45]">{selectedImage.name}</h4>
                      <p className="text-xs text-[#8A99AD] mt-0.5">
                        {formatFileSize(selectedImage.size)} • {selectedImage.name.substring(selectedImage.name.lastIndexOf('.')).toUpperCase().replace('.', '')} Creative Image
                      </p>
                    </div>

                    {/* OCR Progress Indicator */}
                    {isExtractingImage && (
                      <div className="p-2.5 bg-white/70 rounded-xl neu-card-sm inline-flex items-center gap-2 text-xs font-semibold text-[#536DFE]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#536DFE]" />
                        <span>{imageProgress || 'Scanning visible text in creative asset...'}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="neu-btn px-3.5 py-1.5 text-xs font-bold text-[#536DFE] hover:text-[#4258E8] flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Replace Image
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="neu-btn px-3.5 py-1.5 text-xs font-bold text-[#EF4444] hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#536DFE]">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-bold text-[#202B45]">
                        Upload an image, poster, advertisement or social media creative.
                      </h4>
                      <p className="text-xs text-[#5E6E82] mt-1">
                        Drag and drop creative assets here, or browse from your device
                      </p>
                      <p className="text-xs text-[#8A99AD] mt-0.5">
                        Supported formats: <strong>PNG, JPG, JPEG, WEBP</strong> (up to 20MB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="neu-btn px-5 py-2.5 text-xs font-bold text-[#202B45] hover:text-[#536DFE] inline-flex items-center gap-2 mt-1"
                    >
                      <UploadCloud className="w-4 h-4 text-[#536DFE]" />
                      Select Image File
                    </button>
                  </div>
                )}
              </div>

              {/* Image Error Display */}
              {imageError && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}
            </div>

            {/* CONTENT PREVIEW & EDITABLE OCR EXTRACTED TEXT (IF ANY DETECTED) */}
            {selectedImage && !isExtractingImage && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    {extractedImageText
                      ? `OCR Detected Text (${extractedImageText.trim().split(/\s+/).length} words)`
                      : 'Multimodal Image Understanding Active'}
                  </span>
                  {extractedImageText && (
                    <span className="text-[10px] text-[#536DFE] font-semibold flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      Editable before submission
                    </span>
                  )}
                </div>

                {extractedImageText ? (
                  <textarea
                    rows={5}
                    value={extractedImageText}
                    onChange={(e) => setExtractedImageText(e.target.value)}
                    className="neu-input w-full p-4 text-xs md:text-sm font-normal leading-relaxed text-[#202B45] resize-y"
                    placeholder="OCR extracted text..."
                  />
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/50 border border-white/80 text-xs text-[#5E6E82] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#536DFE] flex-shrink-0" />
                    <span>
                      Pure creative image detected. Gemini will evaluate brand colors, logo placement, visual typography, and layout balance directly from the image pixels.
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-[#8A99AD]">
                  Original image data is transmitted to Gemini multimodal models alongside organisation brand guidelines.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#D5DDE7]/70">
              <span className="text-xs text-[#8A99AD] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Gemini 3.5 Flash evaluates visual aesthetics, color palettes, logo safety, and typography.
              </span>

              <button
                type="submit"
                disabled={isAnalyzing || isExtractingImage || !selectedImage}
                className={`neu-btn-primary px-6 py-2.5 text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-sm self-end sm:self-auto ${
                  (!selectedImage || isExtractingImage) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Visual Asset...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyse Uploaded Image
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* INSPECTOR & AUDIT STREAM */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#202B45]">
              Compliance Audit Records
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              {reviews.length} Submissions
            </span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="neu-card p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#8A99AD] mb-3">
              <ScanLine className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#202B45]">
              No content reviews on record
            </h4>
            <p className="text-xs text-[#5E6E82] max-w-sm mt-1">
              Submit marketing text, upload a document (PDF, DOCX, TXT), or scan an image (PNG, JPG) above.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Asset Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {reviews.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReviewId(r.id)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeReview?.id === r.id
                      ? 'neu-active text-[#536DFE]'
                      : 'neu-btn text-[#5E6E82] hover:text-[#202B45]'
                  }`}
                >
                  <span>{r.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded ${
                      r.score >= 85
                        ? 'bg-[#10B981]/15 text-[#047857]'
                        : r.score >= 70
                        ? 'bg-[#F59E0B]/15 text-[#B45309]'
                        : 'bg-[#EF4444]/15 text-[#B91C1C]'
                    }`}
                  >
                    {r.score}%
                  </span>
                </button>
              ))}
            </div>

            {/* Active Review Details Workspace */}
            {activeReview && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Col: Submission Details, Preview & Text (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="neu-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 pb-3 border-b border-[#D5DDE7]/70">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-[#202B45]">
                            {activeReview.title}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 text-[#5E6E82] border border-[#D1D9E6]">
                            {activeReview.contentType}
                          </span>
                          {activeReview.assignedTo && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE] flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Assigned: {activeReview.assignedTo}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8A99AD] mt-1">
                          Mode: {
                            activeReview.submissionMode === 'image'
                              ? 'Image Upload (Multimodal & OCR)'
                              : activeReview.submissionMode === 'document'
                              ? 'Document Ingestion'
                              : 'Direct Text Copy'
                          } • Submitted {activeReview.timestamp}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setShowCertificateModal(true)}
                          className="neu-btn px-3 py-1.5 text-xs font-bold text-[#536DFE] hover:text-[#4258E8] flex items-center gap-1.5"
                          title="Generate printable Multimodal Compliance Certificate & Audit"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Certificate & Audit PDF
                        </button>

                        {/* Publish to CMS / Integrations Hub */}
                        {activeReview.status === 'Approved' && (
                          currentUserRole === 'Manager' ? (
                            activeReview.productionClearance ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPublishModal(true);
                                  setPublishIsSimulation(true);
                                  setPublishFeedback(null);
                                  setPublishNotes('');
                                }}
                                className="neu-btn px-3 py-1.5 text-xs font-bold text-[#10B981] hover:text-[#059669] flex items-center gap-1.5 shadow-xs"
                                title="Publish production-cleared collateral via Integrations Hub"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                Publish
                              </button>
                            ) : (
                              <span
                                className="text-[10px] font-bold text-[#8A99AD] bg-white/50 border border-white px-2 py-1 rounded-xl flex items-center gap-1"
                                title="Production clearance required before publishing can be unlocked"
                              >
                                <ShieldCheck className="w-3 h-3 text-[#F59E0B]" />
                                Clearance Req.
                              </span>
                            )
                          ) : (
                            <span
                              className="text-[10px] font-bold text-[#8A99AD] bg-white/50 border border-white px-2 py-1 rounded-xl"
                              title="Manager credentials required for publishing"
                            >
                              Manager Publishing Only
                            </span>
                          )
                        )}

                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            activeReview.status === 'Approved'
                              ? 'bg-[#10B981]/15 text-[#047857]'
                              : activeReview.status === 'Changes Requested'
                              ? 'bg-[#F59E0B]/15 text-[#B45309]'
                              : activeReview.status === 'Rejected' || activeReview.status === 'Flagged'
                              ? 'bg-[#EF4444]/15 text-[#B91C1C]'
                              : 'bg-[#536DFE]/15 text-[#536DFE]'
                          }`}
                        >
                          {activeReview.status}
                        </span>
                      </div>
                    </div>

                    {/* ASSIGNMENT CONTROL BAR */}
                    <div className="mb-4 p-3 rounded-xl bg-white/50 border border-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#536DFE]" />
                        <span className="font-bold text-[#202B45]">Content Ownership Assignment:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentUserRole === 'Manager' ? (
                          <select
                            value={activeReview.assignedTo || ''}
                            onChange={(e) => handleAssignReviewer(e.target.value)}
                            className="neu-input px-3 py-1.5 text-xs font-bold text-[#202B45] cursor-pointer"
                            title="Assign or reassign review ownership (Manager capability)"
                          >
                            <option value="">Unassigned (Open Queue)</option>
                            {(teamMembers || []).map(m => (
                              <option key={m.id} value={m.name}>
                                {m.name} ({m.roleType})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="neu-card-sm px-3 py-1.5 rounded-xl text-xs font-bold text-[#202B45] bg-white/80 border border-white flex items-center gap-1.5">
                            {activeReview.assignedTo ? `Assigned to: ${activeReview.assignedTo}` : 'Unassigned (Open Queue)'}
                            <span className="text-[10px] text-[#8A99AD] font-normal ml-1">
                              (Manager role required to assign)
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {assignmentFeedback && (
                      <div className="mb-4 p-2.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-xs font-bold flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        <span>{assignmentFeedback}</span>
                      </div>
                    )}

                    {/* VISUAL COMPLIANCE & BRAND CREATIVE ANALYSIS CARD */}
                    {(activeReview.submissionMode === 'image' || activeReview.visualAnalysis || activeReview.originalFile?.previewUrl) && (
                      <div className="mb-5 p-5 rounded-2xl bg-white/70 neu-card-sm border border-white/90 space-y-4">
                        {/* Header: Visual Preview & Visual Score */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-[#D5DDE7]/70">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#536DFE]/10 text-[#536DFE] flex items-center justify-center neu-card-sm">
                              <Palette className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm md:text-base font-bold text-[#202B45] flex items-center gap-2">
                                Visual Compliance & Brand Creative Audit
                              </h4>
                              <p className="text-xs text-[#5E6E82]">
                                Multimodal inspection: Brand palette, logo safe-zones, typography & layout
                              </p>
                            </div>
                          </div>

                          {/* Visual Score Badge */}
                          {activeReview.visualAnalysis?.visualScore !== undefined && activeReview.visualAnalysis?.visualScore !== null && (
                            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white neu-card-sm border border-white">
                              <span className="text-xs font-bold text-[#5E6E82]">Visual Score:</span>
                              <span
                                className={`text-base font-extrabold ${
                                  activeReview.visualAnalysis.visualScore >= 85
                                    ? 'text-[#10B981]'
                                    : activeReview.visualAnalysis.visualScore >= 70
                                    ? 'text-[#F59E0B]'
                                    : 'text-[#EF4444]'
                                }`}
                              >
                                {activeReview.visualAnalysis.visualScore}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Approved Master Reference Logo Banner */}
                        {activeReview.approvedLogoUsed && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 neu-card-sm border border-white text-xs">
                            <div className="flex items-center gap-2.5">
                              {activeReview.approvedLogoUsed.previewUrl && (
                                <div className="w-14 h-9 rounded-lg bg-white border border-[#D5DDE7] p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  <img
                                    src={activeReview.approvedLogoUsed.previewUrl}
                                    alt="Master Logo Reference"
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-[#202B45] flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                                  Master Logo Reference: {activeReview.approvedLogoUsed.name}
                                </span>
                                <span className="text-[10px] text-[#5E6E82]">
                                  Official {activeReview.approvedLogoUsed.variant || 'Master'} Asset ({activeReview.approvedLogoUsed.fileType})
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full self-start sm:self-auto ${
                              activeReview.visualAnalysis?.logoAssessment?.distortionDetected || activeReview.visualAnalysis?.logoAssessment?.colorVariationDetected
                                ? 'bg-[#EF4444]/15 text-[#B91C1C]'
                                : 'bg-[#10B981]/15 text-[#047857]'
                            }`}>
                              {activeReview.visualAnalysis?.logoAssessment?.referenceStatus || 'Verified Against Master'}
                            </span>
                          </div>
                        )}

                        {/* Image Preview & File Meta */}
                        {activeReview.originalFile?.previewUrl && (
                          <div className="relative rounded-2xl overflow-hidden bg-[#202B45]/5 border border-[#D5DDE7]/80 p-2 flex items-center justify-center group">
                            <img
                              src={activeReview.originalFile.previewUrl}
                              alt={activeReview.title || 'Creative Preview'}
                              className="max-h-64 max-w-full object-contain rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomModalImage(activeReview.originalFile.previewUrl)}
                              className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white shadow-md backdrop-blur-sm transition-all flex items-center gap-1.5 text-xs font-semibold"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              Inspect High-Res
                            </button>
                          </div>
                        )}

                        {activeReview.originalFile && (
                          <div className="flex items-center justify-between text-xs px-2 text-[#5E6E82]">
                            <span className="font-semibold text-[#202B45]">
                              {activeReview.originalFile.name}
                            </span>
                            <span className="font-mono text-[#8A99AD]">
                              {activeReview.originalFile.fileType} • {activeReview.originalFile.size}
                            </span>
                          </div>
                        )}

                        {/* DETECTED COLOURS AND HEX CODES */}
                        {activeReview.visualAnalysis?.detectedColors && activeReview.visualAnalysis.detectedColors.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <span className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block">
                              Detected Asset Colours & HEX Codes
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                              {activeReview.visualAnalysis.detectedColors.map((col, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded-xl bg-white/80 neu-card-sm border border-white flex items-center gap-2.5"
                                >
                                  <div
                                    className="w-7 h-7 rounded-lg border border-black/10 shadow-inner flex-shrink-0"
                                    style={{ backgroundColor: col.hex }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-mono font-bold text-[#202B45] uppercase truncate">
                                      {col.hex}
                                    </div>
                                    <div className="text-[10px] text-[#8A99AD] truncate">
                                      {col.name || 'Swatch'}
                                    </div>
                                    <span
                                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                                        col.isBrandApproved
                                          ? 'bg-[#10B981]/15 text-[#047857]'
                                          : 'bg-[#EF4444]/15 text-[#B91C1C]'
                                      }`}
                                    >
                                      {col.isBrandApproved ? 'Approved Brand' : 'Unapproved'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* BRAND PALETTE COMPARISON */}
                        {activeReview.visualAnalysis?.brandPaletteComparison && (
                          <div className="p-3.5 rounded-xl bg-white/60 neu-card-sm border border-white space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#202B45] flex items-center gap-1.5">
                                <Palette className="w-3.5 h-3.5 text-[#536DFE]" />
                                Brand Palette Comparison ({activeReview.organisationId || selectedOrganisation})
                              </span>
                            </div>

                            {activeReview.visualAnalysis.brandPaletteComparison.summary && (
                              <p className="text-[#5E6E82] leading-relaxed">
                                {activeReview.visualAnalysis.brandPaletteComparison.summary}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[10px] font-bold uppercase text-[#047857]">Matched:</span>
                              {(activeReview.visualAnalysis.brandPaletteComparison.matchedBrandColors || []).length > 0 ? (
                                activeReview.visualAnalysis.brandPaletteComparison.matchedBrandColors.map((hex, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-[#10B981]/15 text-[#047857] flex items-center gap-1"
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: hex }} />
                                    {hex}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-[#8A99AD] italic">None matched</span>
                              )}

                              <span className="text-[10px] font-bold uppercase text-[#B91C1C] ml-2">Unapproved:</span>
                              {(activeReview.visualAnalysis.brandPaletteComparison.unapprovedColorsDetected || []).length > 0 ? (
                                activeReview.visualAnalysis.brandPaletteComparison.unapprovedColorsDetected.map((hex, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-[#EF4444]/15 text-[#B91C1C] flex items-center gap-1"
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: hex }} />
                                    {hex}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-[#8A99AD] italic">None detected</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* VISUAL COMPLIANCE FINDINGS (LOGO, TYPOGRAPHY, LAYOUT) */}
                        {activeReview.visualAnalysis && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            {/* Logo Assessment & Master Comparative Verification */}
                            <div className="p-3.5 rounded-xl bg-white/60 neu-card-sm border border-white space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#202B45] flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#536DFE]" />
                                  Logo Master Verification
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    activeReview.visualAnalysis.logoAssessment?.referenceStatus === 'Unverified (No Master Asset)'
                                      ? 'bg-gray-100 text-[#5E6E82]'
                                      : activeReview.visualAnalysis.logoAssessment?.isCompliant && !activeReview.visualAnalysis.logoAssessment?.distortionDetected && !activeReview.visualAnalysis.logoAssessment?.colorVariationDetected
                                      ? 'bg-[#10B981]/15 text-[#047857]'
                                      : 'bg-[#EF4444]/15 text-[#B91C1C]'
                                  }`}
                                >
                                  {activeReview.visualAnalysis.logoAssessment?.referenceStatus || (activeReview.visualAnalysis.logoAssessment?.isCompliant ? 'Verified Match' : 'Discrepancy')}
                                </span>
                              </div>

                              <div className="space-y-1 text-[11px] text-[#5E6E82]">
                                <p>
                                  <strong>Reference:</strong> {activeReview.visualAnalysis.approvedLogoName || activeReview.approvedLogoUsed?.name || 'Approved Master Asset'}
                                </p>
                                <p>
                                  <strong>Aspect & Scaling:</strong> {
                                    activeReview.visualAnalysis.logoAssessment?.distortionDetected
                                      ? <span className="text-[#B91C1C] font-bold">Distortion Detected (Altered Proportions)</span>
                                      : <span className="text-[#047857] font-semibold">Proportions Preserved</span>
                                  }
                                </p>
                                <p>
                                  <strong>Color Fidelity:</strong> {
                                    activeReview.visualAnalysis.logoAssessment?.colorVariationDetected
                                      ? <span className="text-[#B91C1C] font-bold">Unauthorized Color Shift</span>
                                      : <span className="text-[#047857] font-semibold">Approved Palette Match</span>
                                  }
                                </p>
                                <p>
                                  <strong>Clear Margin:</strong> {activeReview.visualAnalysis.logoAssessment?.clearSpaceCompliance || 'Standard safe-margin applied'}
                                </p>
                              </div>

                              {activeReview.visualAnalysis.logoAssessment?.findings && (
                                <p className="text-[10px] text-[#8A99AD] italic pt-1 border-t border-[#D5DDE7]/50 leading-relaxed">
                                  "{activeReview.visualAnalysis.logoAssessment.findings}"
                                </p>
                              )}
                            </div>

                            {/* Typography Assessment */}
                            <div className="p-3 rounded-xl bg-white/60 neu-card-sm border border-white space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#202B45] flex items-center gap-1.5">
                                  <Type className="w-3.5 h-3.5 text-[#536DFE]" />
                                  Typography & Contrast
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    activeReview.visualAnalysis.typographyAssessment?.contrastCompliance
                                      ? 'bg-[#10B981]/15 text-[#047857]'
                                      : 'bg-[#EF4444]/15 text-[#B91C1C]'
                                  }`}
                                >
                                  {activeReview.visualAnalysis.typographyAssessment?.contrastCompliance ? 'WCAG Pass' : 'Low Contrast'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5E6E82]">
                                <strong>Hierarchy:</strong> {activeReview.visualAnalysis.typographyAssessment?.hierarchyRating || 'Standard'}
                              </p>
                              <p className="text-[11px] text-[#5E6E82]">
                                <strong>Fonts:</strong> {(activeReview.visualAnalysis.typographyAssessment?.fontsDetected || ['Sans-serif']).join(', ')}
                              </p>
                              {activeReview.visualAnalysis.typographyAssessment?.findings && (
                                <p className="text-[10px] text-[#8A99AD] italic pt-1 border-t border-[#D5DDE7]/50">
                                  {activeReview.visualAnalysis.typographyAssessment.findings}
                                </p>
                              )}
                            </div>

                            {/* Layout Assessment */}
                            <div className="p-3 rounded-xl bg-white/60 neu-card-sm border border-white space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#202B45] flex items-center gap-1.5">
                                  <Layout className="w-3.5 h-3.5 text-[#536DFE]" />
                                  Layout Balance
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#536DFE]/15 text-[#536DFE]">
                                  {activeReview.visualAnalysis.layoutAssessment?.spacingBalance ? 'Analyzed' : 'Standard'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5E6E82]">
                                <strong>Spacing:</strong> {activeReview.visualAnalysis.layoutAssessment?.spacingBalance || 'Balanced grid'}
                              </p>
                              <p className="text-[11px] text-[#5E6E82]">
                                <strong>Consistency:</strong> {activeReview.visualAnalysis.layoutAssessment?.visualConsistency || 'Consistent brand look'}
                              </p>
                              {activeReview.visualAnalysis.layoutAssessment?.findings && (
                                <p className="text-[10px] text-[#8A99AD] italic pt-1 border-t border-[#D5DDE7]/50">
                                  {activeReview.visualAnalysis.layoutAssessment.findings}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* RECOMMENDED IMPROVEMENTS */}
                        {activeReview.visualAnalysis?.recommendedImprovements && activeReview.visualAnalysis.recommendedImprovements.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-[#536DFE]/5 border border-[#536DFE]/20 space-y-1.5 text-xs">
                            <span className="font-bold text-[#202B45] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#536DFE]" />
                              Recommended Visual & Creative Improvements
                            </span>
                            <ul className="space-y-1 list-disc list-inside text-[#5E6E82] text-[11px]">
                              {activeReview.visualAnalysis.recommendedImprovements.map((rec, i) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* VERSION HISTORY & AUDIT TRAIL */}
                    {activeReview.versions && activeReview.versions.length > 0 && (
                      <div className="mb-4 p-3 rounded-2xl bg-white/60 neu-card-sm border border-white/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#202B45] flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-[#536DFE]" />
                            Audit Version History ({activeReview.versions.length} {activeReview.versions.length === 1 ? 'Snapshot' : 'Snapshots'})
                          </span>
                          <span className="text-[10px] text-[#8A99AD] font-mono">
                            Organisation: <strong className="text-[#202B45]">{activeReview.organisationId || 'Salesforce'}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                          {activeReview.versions.map((ver) => (
                            <button
                              key={ver.version}
                              type="button"
                              onClick={() => handleSelectVersion(ver)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                selectedVersionNum === ver.version
                                  ? 'neu-active text-[#536DFE] shadow-sm'
                                  : 'neu-btn text-[#5E6E82] hover:text-[#202B45]'
                              }`}
                            >
                              <span>v{ver.version}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                  ver.score >= 85
                                    ? 'bg-[#10B981]/15 text-[#047857]'
                                    : ver.score >= 70
                                    ? 'bg-[#F59E0B]/15 text-[#B45309]'
                                    : 'bg-[#EF4444]/15 text-[#B91C1C]'
                                }`}
                              >
                                {ver.score}%
                              </span>
                              <span className="text-[10px] text-[#8A99AD] font-normal">
                                {ver.timeFormatted || ver.dateFormatted}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* INTERACTIVE AI CONTENT CORRECTION & WORKING COPY EDITOR */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#202B45] flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5 text-[#536DFE]" />
                            Content Correction Editor & Working Copy
                          </span>
                          <p className="text-[10px] text-[#8A99AD] mt-0.5">
                            Accept individual AI replacements, edit suggestions, or re-analyse to recalculate compliance.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {activeReview.violations && activeReview.violations.length > 0 && (
                            <button
                              type="button"
                              onClick={handleApplyAllSuggestions}
                              className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#536DFE] hover:text-[#4258E8] flex items-center gap-1.5"
                              title="Apply all suggested corrections to working copy"
                            >
                              <CheckCheck className="w-3.5 h-3.5 text-[#536DFE]" />
                              Apply All Suggestions
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleResetToOriginal}
                            className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#5E6E82] hover:text-[#202B45] flex items-center gap-1"
                            title="Reset editor text to initial submission"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={9}
                        value={editableContent}
                        onChange={(e) => setEditableContent(e.target.value)}
                        className="neu-input w-full p-4 rounded-2xl text-xs md:text-sm text-[#202B45] leading-relaxed resize-y font-sans select-text"
                        placeholder="Edit content here or accept AI suggestions to resolve violations..."
                      />

                      <div className="flex items-center justify-between text-[11px] text-[#8A99AD] pt-0.5">
                        <span>
                          Word count: <strong>{editableContent ? editableContent.trim().split(/\s+/).filter(Boolean).length : 0}</strong> • Characters: <strong>{editableContent.length}</strong>
                        </span>
                        <span className="text-[10px] font-semibold text-[#536DFE]">
                          Interactive Editor Active
                        </span>
                      </div>

                      {/* Re-analysis Feedback Banners */}
                      {reanalysisSuccess && (
                        <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-xs font-bold flex items-center gap-2 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                          <span>{reanalysisSuccess}</span>
                        </div>
                      )}

                      {reanalysisError && (
                        <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-bold flex items-center gap-2 animate-in fade-in">
                          <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
                          <span>{reanalysisError}</span>
                        </div>
                      )}

                      {/* RE-ANALYSE ACTION BAR */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#536DFE]/12 via-[#536DFE]/6 to-transparent border border-[#536DFE]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h5 className="text-xs font-bold text-[#202B45] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#536DFE]" />
                            Evaluate Corrected Copy with Gemini
                          </h5>
                          <p className="text-[11px] text-[#5E6E82] mt-0.5">
                            Dispatches revised text against approved guidelines to identify remaining issues and update score.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleReanalyze}
                          disabled={isReanalyzing || !editableContent.trim()}
                          className={`neu-btn-primary px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm ${
                            isReanalyzing || !editableContent.trim() ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                        >
                          {isReanalyzing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              Re-analysing with Gemini...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Re-analyse Content
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Active Decision Status Banner if already decided */}
                    {activeReview.decisionDetails && (
                      <div className={`mt-5 p-4 rounded-2xl border ${
                        activeReview.status === 'Approved'
                          ? 'bg-[#10B981]/10 border-[#10B981]/30'
                          : activeReview.status === 'Changes Requested'
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30'
                          : 'bg-[#EF4444]/10 border-[#EF4444]/30'
                      }`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <UserCheck className={`w-4 h-4 ${
                              activeReview.status === 'Approved' ? 'text-[#047857]' : activeReview.status === 'Changes Requested' ? 'text-[#B45309]' : 'text-[#B91C1C]'
                            }`} />
                            <span className="text-xs font-bold text-[#202B45]">
                              Decision Recorded: <span className="uppercase">{activeReview.status}</span> by {activeReview.decisionDetails.reviewer}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-[#8A99AD]">
                            {activeReview.decisionDetails.formattedDate} at {activeReview.decisionDetails.formattedTime}
                          </span>
                        </div>
                        {activeReview.decisionDetails.comments && (
                          <div className="mt-2 p-2.5 rounded-xl bg-white/70 border border-white/80 text-xs text-[#5E6E82]">
                            <strong className="text-[#202B45] block text-[10px] uppercase font-bold text-[#8A99AD] mb-0.5">
                              Reviewer Comments
                            </strong>
                            "{activeReview.decisionDetails.comments}"
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-[#8A99AD] mt-2 pt-2 border-t border-black/5 font-semibold">
                          <span>Org ID: <strong className="text-[#202B45]">{activeReview.organisationId || 'Salesforce'}</strong></span>
                          <span>•</span>
                          <span>Submission ID: <strong className="text-[#202B45]">{activeReview.id}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Human Review & Approval Decision Sign-off */}
                    <div className="mt-5 pt-4 border-t border-[#D5DDE7]/70 space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <label className="text-xs font-bold text-[#202B45] flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-[#536DFE]" />
                            Human Review & Decision Sign-Off
                          </label>
                          <p className="text-[10px] text-[#8A99AD]">
                            Submissions remain Pending Review until explicitly signed off by a human reviewer.
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          activeReview.status === 'Approved'
                            ? 'bg-[#10B981]/15 text-[#047857]'
                            : activeReview.status === 'Changes Requested'
                            ? 'bg-[#F59E0B]/15 text-[#B45309]'
                            : activeReview.status === 'Rejected'
                            ? 'bg-[#EF4444]/15 text-[#B91C1C]'
                            : 'bg-[#536DFE]/15 text-[#536DFE]'
                        }`}>
                          Current Status: {activeReview.status}
                        </span>
                      </div>

                      {/* Reviewer Identity Input */}
                      <div>
                        <label className="text-[11px] font-bold text-[#5E6E82] block mb-1">
                          Reviewer Identity *
                        </label>
                        <input
                          type="text"
                          value={reviewerIdentity}
                          onChange={(e) => setReviewerIdentity(e.target.value)}
                          placeholder="e.g. Workspace Administrator / Sarah Jenkins (Brand Lead)"
                          className="neu-input w-full px-3 py-2 text-xs text-[#202B45]"
                        />
                      </div>

                      {/* Review Comments / Decision Notes */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-[#5E6E82]">
                            Review Comments & Decision Remarks
                          </label>
                          <span className="text-[10px] font-semibold text-[#EF4444]">
                            * Required for Request Revisions & Reject
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={reviewerNotes}
                          onChange={(e) => {
                            setReviewerNotes(e.target.value);
                            if (decisionError) setDecisionError('');
                          }}
                          placeholder="Provide specific feedback, policy context, or instructions for the creator..."
                          className="neu-input w-full p-2.5 text-xs text-[#202B45] resize-none"
                        />
                      </div>

                      {/* Validation Error Message */}
                      {decisionError && (
                        <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#EF4444]" />
                          <span>{decisionError}</span>
                        </div>
                      )}

                      {/* Success Feedback Banner */}
                      {decisionFeedback && (
                        <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-xs font-bold flex items-center gap-2 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                          <span>{decisionFeedback}</span>
                        </div>
                      )}

                      {/* 3 Review Decision Action Buttons or Creator Mode Notice */}
                      {currentUserRole === 'Creator' ? (
                        <div className="p-3.5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-xs text-[#B45309] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <Users className="w-4 h-4 flex-shrink-0 text-[#F59E0B]" />
                            <span>
                              Active in <strong>Creator</strong> role. Use the interactive working copy editor to correct findings. Review decisions and production clearance require <strong>Reviewer</strong> or <strong>Manager</strong> credentials.
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-[#B45309] whitespace-nowrap">
                            Read-Only Sign-off
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                          {/* 1. Reject */}
                          <button
                            type="button"
                            onClick={handleReject}
                            className="neu-btn px-4 py-2 text-xs font-bold text-[#EF4444] hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors"
                            title="Reject submission (requires comments)"
                          >
                            <XCircle className="w-4 h-4 text-[#EF4444]" />
                            Reject Submission
                          </button>

                          {/* 2. Request Revisions */}
                          <button
                            type="button"
                            onClick={handleRequestRevisions}
                            className="neu-btn px-4 py-2 text-xs font-bold text-[#D97706] hover:bg-amber-50 flex items-center justify-center gap-1.5 transition-colors"
                            title="Return for changes and correction (requires comments)"
                          >
                            <RotateCcw className="w-4 h-4 text-[#D97706]" />
                            Request Revisions
                          </button>

                          {/* 3. Approve Asset */}
                          <button
                            type="button"
                            onClick={handleInitiateApprove}
                            className="neu-btn-primary px-5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                            title="Approve content after human verification (requires confirmation)"
                          >
                            <Check className="w-4 h-4" />
                            Approve Asset
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Governance Audit Trail & Timeline History */}
                    <div className="mt-6 pt-5 border-t border-[#D5DDE7]/70">
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-[#536DFE]" />
                          <h5 className="text-xs font-bold text-[#202B45] uppercase tracking-wider">
                            Governance Audit Trail & Decision Log
                          </h5>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 text-[#5E6E82] border border-[#D5DDE7]">
                          {auditEvents.length} Event{auditEvents.length === 1 ? '' : 's'} Logged
                        </span>
                      </div>

                      <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-[#D5DDE7] before:z-0">
                        {auditEvents.map((event, idx) => {
                          const isApproved = event.status === 'Approved' || event.action?.includes('Approved');
                          const isRejected = event.status === 'Rejected' || event.action?.includes('Rejected');
                          const isRevision = event.status === 'Changes Requested' || event.action?.includes('Changes Requested') || event.action?.includes('Re-analysed');

                          return (
                            <div key={event.id || idx} className="relative z-10 flex items-start gap-3 pl-0.5">
                              {/* Dot / Icon */}
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isApproved
                                  ? 'bg-[#10B981] text-white shadow-sm'
                                  : isRejected
                                  ? 'bg-[#EF4444] text-white shadow-sm'
                                  : isRevision
                                  ? 'bg-[#F59E0B] text-white shadow-sm'
                                  : 'bg-[#536DFE] text-white shadow-sm'
                              }`}>
                                {isApproved ? (
                                  <Check className="w-3 h-3" />
                                ) : isRejected ? (
                                  <X className="w-3 h-3" />
                                ) : isRevision ? (
                                  <RotateCcw className="w-3 h-3" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                              </div>

                              {/* Card Content */}
                              <div className="neu-card-sm p-3.5 rounded-xl bg-white/60 border border-white/80 flex-1 text-xs space-y-1.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-bold text-[#202B45]">
                                    {event.action}
                                  </span>
                                  <span className="text-[10px] text-[#8A99AD] font-semibold">
                                    {event.formattedDate} at {event.formattedTime}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-[#5E6E82] flex-wrap">
                                  <span>Actor: <strong className="text-[#202B45]">{event.actor || 'Workspace Administrator'}</strong></span>
                                  {event.role && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      event.role === 'Manager'
                                        ? 'bg-[#536DFE]/15 text-[#536DFE]'
                                        : event.role === 'Reviewer'
                                        ? 'bg-[#10B981]/15 text-[#047857]'
                                        : 'bg-[#F59E0B]/15 text-[#B45309]'
                                    }`}>
                                      {event.role}
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span>Score: <strong className="text-[#202B45]">{event.score}%</strong></span>
                                  <span>•</span>
                                  <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                    isApproved ? 'bg-[#10B981]/15 text-[#047857]' : isRejected ? 'bg-[#EF4444]/15 text-[#B91C1C]' : 'bg-[#F59E0B]/15 text-[#B45309]'
                                  }`}>
                                    {event.status}
                                  </span>
                                </div>

                                {event.comments && (
                                  <p className="text-[11px] text-[#5E6E82] bg-white/80 p-2 rounded-lg border border-[#D5DDE7]/50 mt-1 italic">
                                    "{event.comments}"
                                  </p>
                                )}

                                <div className="flex items-center gap-3 text-[10px] text-[#8A99AD] pt-1 border-t border-[#D5DDE7]/40">
                                  <span>Org: {event.organisationId || activeReview.organisationId || 'Salesforce'}</span>
                                  <span>•</span>
                                  <span>ID: {event.submissionId || activeReview.id}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Col: Actual Rule Findings & Compliance Breakdown (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="neu-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-base font-bold text-[#202B45]">
                          Compliance Rule Findings
                        </h4>
                        <p className="text-xs text-[#8A99AD]">Empirical guideline evaluation</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-2xl font-extrabold ${
                            activeReview.score >= 85
                              ? 'text-[#10B981]'
                              : activeReview.score >= 70
                              ? 'text-[#F59E0B]'
                              : 'text-[#EF4444]'
                          }`}
                        >
                          {activeReview.score}%
                        </span>
                        <span className="text-[10px] font-bold text-[#8A99AD] block">Score</span>
                      </div>
                    </div>

                    {/* Summary */}
                    {activeReview.summary && (
                      <div className="p-3.5 rounded-xl bg-white/50 border border-white/80 text-xs text-[#5E6E82] mb-4">
                        <p className="font-semibold text-[#202B45] mb-0.5">Evaluation Summary:</p>
                        {activeReview.summary}
                      </div>
                    )}

                    {/* Findings & Violations List */}
                    {activeReview.violations && activeReview.violations.length > 0 ? (
                      <div className="space-y-3.5 mb-5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#EF4444] flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                            Identified Issues ({activeReview.violations.length})
                          </span>
                          <span className="text-[10px] text-[#8A99AD] font-semibold">
                            Human Review Required
                          </span>
                        </div>

                        {activeReview.violations.map((v, idx) => {
                          const severity = v.severity || v.priority || 'High';
                          const verificationType = v.verificationType || (severity === 'Critical' ? 'Confirmed Violation' : 'Requires Human Verification');
                          const problematicText = v.problematicText || v.matchedTerm || '';
                          const explanation = v.explanation || v.detail || '';
                          const relevantGuideline = v.relevantGuideline || v.guidelineTitle || '';
                          const suggestedCorrection = v.suggestedCorrection || '';

                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                                severity === 'Critical'
                                  ? 'bg-[#EF4444]/10 border-[#EF4444]/30'
                                  : severity === 'High'
                                  ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30'
                                  : 'bg-white/60 border-white/80 neu-card-sm'
                              }`}
                            >
                              {/* Header Badges: Category, Severity, and Verification Type */}
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 text-[#202B45] border border-[#D1D9E6]">
                                    {v.category || 'Compliance'}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      severity === 'Critical'
                                        ? 'bg-[#EF4444]/20 text-[#B91C1C]'
                                        : severity === 'High'
                                        ? 'bg-[#F59E0B]/20 text-[#B45309]'
                                        : 'bg-[#536DFE]/20 text-[#536DFE]'
                                    }`}
                                  >
                                    {severity} Severity
                                  </span>
                                </div>

                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    verificationType === 'Confirmed Violation'
                                      ? 'bg-red-600/15 text-red-700'
                                      : 'bg-amber-600/15 text-amber-700'
                                  }`}
                                >
                                  {verificationType === 'Confirmed Violation' ? (
                                    <XCircle className="w-3 h-3 text-red-600" />
                                  ) : (
                                    <Eye className="w-3 h-3 text-amber-600" />
                                  )}
                                  {verificationType}
                                </span>
                              </div>

                              {/* 1. Exact Problematic Text */}
                              {problematicText && (
                                <div className="p-2.5 rounded-xl bg-white/80 border-l-4 border-[#EF4444] text-xs text-[#202B45]">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#EF4444] block mb-0.5">
                                    Flagged Copy Excerpt
                                  </span>
                                  <blockquote className="font-serif italic text-xs text-[#202B45]">
                                    "{problematicText}"
                                  </blockquote>
                                </div>
                              )}

                              {/* 2. Relevant Guideline */}
                              {relevantGuideline && (
                                <div className="text-[11px] text-[#5E6E82]">
                                  <strong className="text-[#202B45]">Violated Rule: </strong>
                                  <span className="font-semibold text-[#536DFE]">{relevantGuideline}</span>
                                </div>
                              )}

                              {/* 3. Explanation */}
                              {explanation && (
                                <p className="text-xs text-[#5E6E82] leading-relaxed">
                                  <strong className="text-[#202B45]">Finding: </strong>
                                  {explanation}
                                </p>
                              )}

                              {/* 4. AI Suggested Replacement with Interactive Accept, Edit, and Reject Actions */}
                              {suggestedCorrection && (
                                <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-xs space-y-2">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-[#10B981]" />
                                      AI Suggested Replacement
                                    </span>

                                    {/* Applied / Rejected Badges */}
                                    {acceptedSuggestions[idx] && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#047857] flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        Applied to Editor
                                      </span>
                                    )}
                                    {rejectedSuggestions[idx] && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-[#5E6E82] flex items-center gap-1">
                                        <X className="w-3 h-3" />
                                        Declined
                                      </span>
                                    )}
                                  </div>

                                  {/* Editable Replacement Field if in edit mode */}
                                  {editingReplacementIdx === idx ? (
                                    <div className="space-y-2 pt-1">
                                      <textarea
                                        rows={2}
                                        value={customReplacements[idx] !== undefined ? customReplacements[idx] : suggestedCorrection}
                                        onChange={(e) => setCustomReplacements({ ...customReplacements, [idx]: e.target.value })}
                                        className="neu-input w-full p-2 text-xs text-[#202B45] resize-none"
                                        placeholder="Customize replacement text..."
                                      />
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setEditingReplacementIdx(null)}
                                          className="neu-btn px-2.5 py-1 text-[11px] font-semibold text-[#5E6E82]"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleAcceptSuggestion(idx, v)}
                                          className="neu-btn-primary px-3 py-1 text-[11px] font-bold"
                                        >
                                          Apply Customization
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="font-medium text-[#065F46] leading-relaxed select-text">
                                      {customReplacements[idx] !== undefined ? customReplacements[idx] : suggestedCorrection}
                                    </p>
                                  )}

                                  {/* Suggestion Action Buttons */}
                                  {editingReplacementIdx !== idx && (
                                    <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-[#10B981]/20 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => setEditingReplacementIdx(idx)}
                                        className="neu-btn px-2.5 py-1 text-[11px] font-bold text-[#5E6E82] hover:text-[#202B45] flex items-center gap-1"
                                        title="Edit this AI suggestion before applying"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleRejectSuggestion(idx)}
                                        className={`neu-btn px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 ${
                                          rejectedSuggestions[idx] ? 'text-gray-400 bg-gray-100' : 'text-[#EF4444] hover:bg-red-50'
                                        }`}
                                        title="Decline this AI suggestion"
                                      >
                                        <X className="w-3 h-3" />
                                        Reject
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleAcceptSuggestion(idx, v)}
                                        className={`neu-btn px-3 py-1 text-[11px] font-bold flex items-center gap-1 transition-all ${
                                          acceptedSuggestions[idx]
                                            ? 'bg-[#10B981] text-white shadow-sm'
                                            : 'text-[#047857] hover:bg-[#10B981]/20'
                                        }`}
                                        title="Replace problematic text in the editor"
                                      >
                                        <Check className="w-3 h-3" />
                                        {acceptedSuggestions[idx] ? 'Re-Apply' : 'Accept Suggestion'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-xs font-bold flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        <span>No guideline violations detected. Content complies with active brand rules.</span>
                      </div>
                    )}

                    {/* Checks List */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A99AD] block">
                        Evaluated Rules
                      </span>
                      {activeReview.checks && activeReview.checks.length > 0 ? (
                        activeReview.checks.map((chk, idx) => (
                          <div key={idx} className="p-3 rounded-xl neu-card-sm border border-white/70 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#202B45]">{chk.name}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  chk.status === 'pass'
                                    ? 'bg-[#10B981]/15 text-[#047857]'
                                    : 'bg-[#EF4444]/15 text-[#B91C1C]'
                                }`}
                              >
                                {chk.status === 'pass' ? 'Passed' : 'Discrepancy'}
                              </span>
                            </div>
                            <p className="text-[#5E6E82] text-[11px] mt-1">{chk.detail}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#8A99AD]">No rule evaluations recorded.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* HUMAN APPROVAL CONFIRMATION MODAL */}
      {showApprovalModal && activeReview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="neu-card p-6 md:p-7 max-w-lg w-full space-y-5 border border-white/80 shadow-2xl bg-[#E8ECF3]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#10B981]/15 text-[#047857] flex items-center justify-center neu-card-sm flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">
                    Confirm Asset Approval
                  </h3>
                  <p className="text-xs text-[#5E6E82]">
                    Official Governance Sign-off
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Asset Metadata Preview */}
            <div className="p-3.5 rounded-xl neu-input bg-white/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8A99AD]">Collateral:</span>
                <span className="font-bold text-[#202B45] truncate max-w-[240px]">{activeReview.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8A99AD]">Organisation:</span>
                <span className="font-bold text-[#536DFE]">{activeReview.organisationId || 'Salesforce'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8A99AD]">Compliance Score:</span>
                <span className={`font-extrabold ${
                  activeReview.score >= 85 ? 'text-[#10B981]' : activeReview.score >= 70 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                }`}>
                  {activeReview.score}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8A99AD]">Reviewer:</span>
                <span className="font-bold text-[#202B45]">{reviewerIdentity || 'Workspace Administrator'}</span>
              </div>
            </div>

            {/* Score / Violation Warning if score < 85% or has issues */}
            {(activeReview.score < 85 || (activeReview.violations && activeReview.violations.length > 0)) && (
              <div className="p-3.5 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-xs text-[#B45309] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#F59E0B] mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Approval Warning</span>
                  This asset scored <strong>{activeReview.score}%</strong> with <strong>{activeReview.violations?.length || 0}</strong> unresolved issue(s). Final human approval will officially mark this asset as Approved and certify it for distribution.
                </div>
              </div>
            )}

            {reviewerNotes && (
              <div className="p-3 rounded-xl bg-white/50 text-xs text-[#5E6E82]">
                <span className="font-bold text-[#202B45] block text-[10px] uppercase mb-0.5">Attached Reviewer Note:</span>
                "{reviewerNotes}"
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white shadow-sm"
              >
                <Check className="w-4 h-4" />
                Confirm & Sign Off Approval
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Visual Creative Zoom Modal */}
      {zoomModalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-4 shadow-2xl neu-card border border-white flex flex-col items-center">
            <button
              type="button"
              onClick={() => setZoomModalImage(null)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-black/60 hover:bg-black/80 text-white z-10 transition-all"
              title="Close image zoom"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-auto max-h-[80vh] w-full flex items-center justify-center p-2">
              <img
                src={zoomModalImage}
                alt="Enlarged creative preview"
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-md"
              />
            </div>
            <div className="w-full flex items-center justify-between text-xs text-[#5E6E82] pt-3 px-2 border-t border-[#D5DDE7]">
              <span className="font-semibold">Full Resolution Visual Creative</span>
              <button
                type="button"
                onClick={() => setZoomModalImage(null)}
                className="neu-btn px-3 py-1 text-xs font-bold text-[#202B45]"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMBINED MULTIMODAL COMPLIANCE CERTIFICATE & AUDIT PDF MODAL */}
      {showCertificateModal && activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-6 md:p-8 shadow-2xl neu-card border border-white flex flex-col overflow-y-auto">
            {/* Certificate Header Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-[#D5DDE7]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#536DFE]">
                  Multimodal Governance Certification
                </span>
                <h3 className="text-xl font-extrabold text-[#202B45]">
                  BrandGuard AI Compliance Certificate & Audit Record
                </h3>
                <p className="text-xs text-[#5E6E82]">
                  Asset: <strong>{activeReview.title}</strong> • {activeReview.organisationId || selectedOrganisation}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="neu-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(false)}
                  className="neu-btn p-2 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Certificate Body */}
            <div className="space-y-6 pt-5 print:p-0">
              {/* Asset Status & Score Banner */}
              <div className="p-4 rounded-2xl bg-[#E8ECF3] border border-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-[#8A99AD] uppercase block">Compliance Verdict</span>
                  <div className="text-2xl font-black text-[#202B45] flex items-center gap-2">
                    <span>{activeReview.status}</span>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                      activeReview.score >= 85 ? 'bg-[#10B981]/15 text-[#047857]' : activeReview.score >= 70 ? 'bg-[#F59E0B]/15 text-[#B45309]' : 'bg-[#EF4444]/15 text-[#B91C1C]'
                    }`}>
                      {activeReview.score}% Score
                    </span>
                  </div>
                  <p className="text-xs text-[#5E6E82] mt-0.5">
                    Evaluated via {activeReview.modelUsed || 'Gemini 3.5 Flash'} Multimodal Engine
                  </p>
                </div>

                {activeReview.decisionDetails && (
                  <div className="text-right text-xs">
                    <span className="text-[10px] text-[#8A99AD] block">Certified Sign-off</span>
                    <strong className="text-[#202B45]">{activeReview.decisionDetails.reviewer}</strong>
                    <span className="text-[#8A99AD] block text-[10px]">{activeReview.decisionDetails.formattedDate} at {activeReview.decisionDetails.formattedTime}</span>
                  </div>
                )}
              </div>

              {/* Multimodal Creative Asset & Detected Swatches (If Image Submission) */}
              {(activeReview.originalFile?.previewUrl || activeReview.visualAnalysis) && (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#202B45] flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-[#536DFE]" />
                      Visual Creative Multimodal Inspection
                    </h4>
                    {activeReview.visualAnalysis?.visualScore !== undefined && activeReview.visualAnalysis?.visualScore !== null && (
                      <span className="text-xs font-bold text-[#536DFE]">
                        Visual Score: {activeReview.visualAnalysis.visualScore}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {activeReview.originalFile?.previewUrl && (
                      <div className="p-2 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                        <img
                          src={activeReview.originalFile.previewUrl}
                          alt="Creative Inspection"
                          className="max-h-48 object-contain rounded-lg"
                        />
                      </div>
                    )}

                    {/* Detected Colors */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-gray-700 block">
                        Detected Palette & HEX Codes
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(activeReview.visualAnalysis?.detectedColors || []).map((c, i) => (
                          <div key={i} className="p-1.5 rounded-lg bg-white border border-gray-200 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md border flex-shrink-0" style={{ backgroundColor: c.hex }} />
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-bold block">{c.hex}</span>
                              <span className="text-[9px] text-gray-500">{c.isBrandApproved ? 'Approved' : 'Unapproved'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Logo, Typography & Layout Summaries */}
                  {activeReview.visualAnalysis && (
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-gray-200">
                      <div>
                        <strong className="block text-gray-900">Logo Master Verification:</strong>
                        <span className="text-gray-600 block truncate">
                          {activeReview.visualAnalysis.logoAssessment?.referenceStatus || (activeReview.visualAnalysis.logoAssessment?.isCompliant ? 'Verified Match' : 'Discrepancy')}
                        </span>
                        {activeReview.approvedLogoUsed && (
                          <span className="text-[10px] text-gray-500 block truncate">
                            Ref: {activeReview.approvedLogoUsed.name}
                          </span>
                        )}
                      </div>
                      <div>
                        <strong className="block text-gray-900">Typography:</strong>
                        <span className="text-gray-600">{activeReview.visualAnalysis.typographyAssessment?.hierarchyRating || 'Standard'}</span>
                      </div>
                      <div>
                        <strong className="block text-gray-900">Layout:</strong>
                        <span className="text-gray-600">{activeReview.visualAnalysis.layoutAssessment?.spacingBalance || 'Balanced'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Text Violations & Guidelines Evaluated */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#202B45] mb-2">
                  Guideline Violations & Findings ({activeReview.violations?.length || 0})
                </h4>
                {activeReview.violations && activeReview.violations.length > 0 ? (
                  <div className="space-y-2">
                    {activeReview.violations.map((v, i) => (
                      <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{v.relevantGuideline || v.category || 'Standard'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200">{v.severity || 'High'}</span>
                        </div>
                        <p className="text-gray-600">{v.explanation || v.detail}</p>
                        {v.suggestedCorrection && (
                          <div className="p-1.5 rounded bg-white text-[11px] text-emerald-700 font-mono">
                            Correction: {v.suggestedCorrection}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
                    ✓ Zero guideline violations detected. Asset is fully certified.
                  </div>
                )}
              </div>

              {/* Reviewer Comments & Audit Seal */}
              {activeReview.decisionDetails?.comments && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                  <strong className="block text-gray-900 mb-0.5">Attached Reviewer Comments:</strong>
                  <p className="italic text-gray-700">"{activeReview.decisionDetails.comments}"</p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-[#E8ECF3] border border-white flex items-center justify-between text-xs text-[#5E6E82]">
                <div>
                  <span className="font-bold text-[#202B45] block">BrandGuard AI Governance Verification Stamp</span>
                  Recorded in immutable audit history for {activeReview.organisationId || selectedOrganisation}.
                </div>
                <span className="font-mono text-[10px] text-[#8A99AD] font-bold">
                  AUTH-{activeReview.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH TO CMS / SOCIAL MODAL */}
      {showPublishModal && activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl neu-card border border-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5DDE7]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 text-[#047857] flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#202B45]">Publish Production Asset</h4>
                  <p className="text-xs text-[#5E6E82]">Automated CMS, Social & Webhook Dispatch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="neu-btn p-1.5 text-[#8A99AD] hover:text-[#202B45] rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#E8ECF3] text-xs space-y-1.5 border border-white">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8A99AD]">Collateral:</span>
                <strong className="text-sm font-bold text-[#202B45] truncate max-w-[260px]">{activeReview.title}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8A99AD]">Compliance Score:</span>
                <span className="text-[11px] text-[#10B981] font-extrabold">{activeReview.score}%</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="font-semibold text-[#8A99AD]">Production Clearance:</span>
                {activeReview.productionClearance ? (
                  <span className="text-[10px] font-extrabold text-[#047857] bg-[#10B981]/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                    Verified Cleared
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-[#B91C1C] bg-[#EF4444]/15 px-2 py-0.5 rounded-full">
                    Awaiting Clearance
                  </span>
                )}
              </div>
            </div>

            {publishFeedback && (
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                publishFeedback.error ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#B91C1C]' : 'bg-[#10B981]/15 border-[#10B981]/30 text-[#065F46]'
              }`}>
                {publishFeedback.error ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                <span>{publishFeedback.message}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                Distribution Destination:
              </label>
              <select
                value={publishPlatform}
                onChange={(e) => setPublishPlatform(e.target.value)}
                className="neu-input w-full px-3 py-2 text-xs font-bold text-[#202B45]"
              >
                <option value="Custom Webhooks">Custom Webhooks (content.published Event)</option>
                <option value="WordPress CMS">WordPress CMS (Production Posts API)</option>
                <option value="LinkedIn">LinkedIn (Corporate Page Feed)</option>
                <option value="Slack">Slack (#brand-releases Notification)</option>
              </select>
            </div>

            {/* Publishing Mode: Simulation vs Live */}
            <div className="p-3 rounded-xl bg-white/70 border border-white space-y-2">
              <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block">
                Publishing Mode:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                  publishIsSimulation ? 'bg-[#536DFE]/10 border-[#536DFE] text-[#536DFE]' : 'bg-white/60 border-slate-200 text-[#5E6E82]'
                }`}>
                  <input
                    type="radio"
                    name="pubModeCr"
                    checked={publishIsSimulation}
                    onChange={() => setPublishIsSimulation(true)}
                    className="mt-0.5 accent-[#536DFE]"
                  />
                  <div>
                    <div className="font-bold text-[11px]">Simulation Mode</div>
                    <div className="text-[10px] opacity-80 leading-tight">Dispatches to test sandbox. Never claims actual publication.</div>
                  </div>
                </label>

                <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                  !publishIsSimulation ? 'bg-[#10B981]/10 border-[#10B981] text-[#047857]' : 'bg-white/60 border-slate-200 text-[#5E6E82]'
                }`}>
                  <input
                    type="radio"
                    name="pubModeCr"
                    checked={!publishIsSimulation}
                    onChange={() => setPublishIsSimulation(false)}
                    className="mt-0.5 accent-[#10B981]"
                  />
                  <div>
                    <div className="font-bold text-[11px]">Live Integration</div>
                    <div className="text-[10px] opacity-80 leading-tight">Requires verified API credentials in Settings.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* WordPress Post Status (Draft vs Publish) */}
            {publishPlatform === 'WordPress CMS' && !publishIsSimulation && (
              <div className="p-3 rounded-xl bg-[#21759B]/10 border border-[#21759B]/20 space-y-2">
                <label className="text-[11px] font-bold text-[#21759B] uppercase tracking-wider block">
                  WordPress Target Post Status:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`p-2 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                    wpPostStatus === 'draft' ? 'bg-white border-[#21759B] text-[#21759B] font-bold shadow-sm' : 'bg-white/60 border-slate-200 text-[#5E6E82]'
                  }`}>
                    <input
                      type="radio"
                      name="wpStatusCr"
                      value="draft"
                      checked={wpPostStatus === 'draft'}
                      onChange={() => setWpPostStatus('draft')}
                      className="mt-0.5 accent-[#21759B]"
                    />
                    <div>
                      <div className="text-[11px]">Draft (Recommended)</div>
                      <div className="text-[9px] opacity-75 leading-tight">Saved to WP editorial queue for review before public release.</div>
                    </div>
                  </label>

                  <label className={`p-2 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                    wpPostStatus === 'publish' ? 'bg-white border-[#10B981] text-[#047857] font-bold shadow-sm' : 'bg-white/60 border-slate-200 text-[#5E6E82]'
                  }`}>
                    <input
                      type="radio"
                      name="wpStatusCr"
                      value="publish"
                      checked={wpPostStatus === 'publish'}
                      onChange={() => setWpPostStatus('publish')}
                      className="mt-0.5 accent-[#10B981]"
                    />
                    <div>
                      <div className="text-[11px]">Publish Live</div>
                      <div className="text-[9px] opacity-75 leading-tight">Published immediately visible to the public.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Dispatch Notes */}
            <div>
              <label className="text-[11px] font-bold text-[#5E6E82] block mb-1">
                Distribution / Campaign Notes:
              </label>
              <input
                type="text"
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="Release notes or campaign identifier (e.g. Q4 Global Campaign Release)..."
                className="neu-input w-full px-3 py-1.5 text-xs text-[#202B45]"
              />
            </div>

            {/* Publishing History */}
            {activeReview.publishingHistory && activeReview.publishingHistory.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-[#202B45]">
                  <span>Publishing History:</span>
                  <span className="text-[10px] text-[#8A99AD] font-medium">{activeReview.publishingHistory.length} record(s)</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[10px]">
                  {activeReview.publishingHistory.map((hist) => (
                    <div key={hist.id} className="p-2 rounded-lg bg-[#E8ECF3] border border-white flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${hist.status.includes('Published') ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                        <span className="font-bold text-[#202B45]">{hist.channel}</span>
                        {hist.publishedUrl ? (
                          <a
                            href={hist.publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#536DFE] hover:underline font-semibold"
                          >
                            Post #{hist.wordpressPostId || 'Link'}
                          </a>
                        ) : null}
                        <span className="text-[#8A99AD] truncate max-w-[140px]">{hist.notes}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          hist.status.includes('Published') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {hist.status}
                        </span>
                        <span className="text-[#8A99AD]">{hist.formattedTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishAsset}
                disabled={!activeReview.productionClearance || isPublishing}
                className="neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm bg-[#10B981] hover:bg-[#059669] text-white disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isPublishing
                  ? 'Publishing to WordPress...'
                  : publishIsSimulation
                  ? 'Dispatch Simulation'
                  : 'Live Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
