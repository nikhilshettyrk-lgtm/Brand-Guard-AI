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
  Send
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
    selectedOrganisation
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

  // Tab C: Upload Images State (PNG, JPG, JPEG)
  const imageInputRef = useRef(null);
  const [imageTitle, setImageTitle] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [extractedImageText, setExtractedImageText] = useState('');
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState('');
  const [imageError, setImageError] = useState('');
  const [isImageDragOver, setIsImageDragOver] = useState(false);

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

    const allowedExtensions = ['.png', '.jpg', '.jpeg'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    // File type validation
    if (!allowedExtensions.includes(fileExt)) {
      setImageError(`Unsupported image format "${fileExt}". Please upload a PNG, JPG, or JPEG image.`);
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

    // Create persistent Data URL preview for image visual analysis and future Gemini integration
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
    setImageProgress(`Initializing OCR for ${file.name}...`);

    try {
      const extraction = await extractTextFromFile(file, (pct, status) => {
        setImageProgress(status);
      });
      setExtractedImageText(extraction.text);
      setImageProgress('');
    } catch (err) {
      setImageError(err.message || 'Failed to extract text from image using OCR.');
      setExtractedImageText('');
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

  const executeAnalysis = async ({ title, category, text, submissionMode, originalFile, imagePreview }) => {
    setAnalysisError('');
    setAnalysisSuccess('');

    if (!title.trim()) {
      setAnalysisError('Please enter a content title.');
      return;
    }

    if (!text || !text.trim()) {
      setAnalysisError('No readable text content provided for compliance checking.');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Run compliance analysis against actual saved guidelines
      const analysisResult = await analyzeContentCompliance({
        content: text.trim(),
        title: title.trim(),
        contentType: category,
        guidelines: manualGuidelines,
        uploadedDocuments: uploadedDocuments,
        sensitivityThreshold: settings.sensitivity || 85
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
        extractedText: text.trim(),
        organisationId: selectedOrganisation,
        department: category,
        status: analysisResult.status || 'Pending Review',
        score: analysisResult.score !== null ? analysisResult.score : 0,
        summary: analysisResult.summary,
        checks: analysisResult.checks,
        violations: analysisResult.findings || analysisResult.violations || [],
        findings: analysisResult.findings || analysisResult.violations || [],
        modelUsed: analysisResult.modelUsed || 'gemini-3.5-flash'
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
      setImageError('Please upload a PNG, JPG, or JPEG image first.');
      return;
    }
    if (isExtractingImage) {
      setAnalysisError('Please wait for image OCR extraction to complete.');
      return;
    }
    if (!extractedImageText.trim()) {
      setImageError('Cannot analyze: No readable text extracted from image.');
      return;
    }

    executeAnalysis({
      title: imageTitle || selectedImage.name,
      category: contentCategory,
      text: extractedImageText,
      submissionMode: 'image',
      originalFile: selectedImage,
      imagePreview: imagePreviewUrl
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
    if (!editableContent.trim()) {
      setReanalysisError('Cannot re-analyse empty content.');
      return;
    }
    setIsReanalyzing(true);
    setReanalysisError('');
    setReanalysisSuccess('');

    try {
      const analysisResult = await analyzeContentCompliance({
        content: editableContent.trim(),
        title: activeReview.title,
        contentType: activeReview.contentType,
        guidelines: manualGuidelines,
        uploadedDocuments: uploadedDocuments,
        sensitivityThreshold: settings.sensitivity || 85
      });

      const nextVer = (activeReview.versions?.length || 1) + 1;
      updateReviewWithReanalysis(activeReview.id, {
        content: editableContent.trim(),
        score: analysisResult.score !== null ? analysisResult.score : 0,
        status: analysisResult.status || 'Pending Review', // Never automatically approved!
        summary: analysisResult.summary,
        findings: analysisResult.findings || analysisResult.violations || [],
        violations: analysisResult.findings || analysisResult.violations || [],
        checks: analysisResult.checks || [],
        modelUsed: analysisResult.modelUsed || 'gemini-3.5-flash',
        organisationId: activeReview.organisationId || selectedOrganisation,
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
    updateReviewStatus(
      selectedReviewId,
      'Approved',
      reviewerNotes.trim() || 'Approved after human compliance review.',
      reviewerIdentity.trim() || 'Workspace Administrator'
    );
    setShowApprovalModal(false);
    setDecisionFeedback('Asset marked as: Approved');
    setTimeout(() => setDecisionFeedback(null), 3000);
  };

  const handleRequestRevisions = () => {
    setDecisionError('');
    if (!reviewerNotes.trim()) {
      setDecisionError('Review comments are strictly required when requesting revisions to specify what changes the creator must make.');
      return;
    }
    updateReviewStatus(
      selectedReviewId,
      'Changes Requested',
      reviewerNotes.trim(),
      reviewerIdentity.trim() || 'Workspace Administrator'
    );
    setDecisionFeedback('Asset returned to creator: Changes Requested');
    setTimeout(() => setDecisionFeedback(null), 3000);
  };

  const handleReject = () => {
    setDecisionError('');
    if (!reviewerNotes.trim()) {
      setDecisionError('Review comments are strictly required when rejecting content to explain the policy or brand conflict.');
      return;
    }
    updateReviewStatus(
      selectedReviewId,
      'Rejected',
      reviewerNotes.trim(),
      reviewerIdentity.trim() || 'Workspace Administrator'
    );
    setDecisionFeedback('Asset marked as: Rejected');
    setTimeout(() => setDecisionFeedback(null), 3000);
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
        accept=".png,.jpg,.jpeg"
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
        {/* OPTION C: UPLOAD IMAGES (PNG, JPG, JPEG)                        */}
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
                Upload Image Asset (PNG, JPG, JPEG) *
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
                      <div className="max-w-xs mx-auto rounded-2xl overflow-hidden neu-card-sm border border-white p-2 bg-white/60">
                        <img
                          src={imagePreviewUrl}
                          alt="Uploaded asset preview"
                          className="max-h-48 w-full object-contain rounded-xl"
                        />
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm md:text-base font-bold text-[#202B45]">{selectedImage.name}</h4>
                      <p className="text-xs text-[#8A99AD] mt-0.5">
                        {formatFileSize(selectedImage.size)} • {selectedImage.name.substring(selectedImage.name.lastIndexOf('.')).toUpperCase().replace('.', '')} Image
                      </p>
                    </div>

                    {/* OCR Progress Indicator */}
                    {isExtractingImage && (
                      <div className="p-2.5 bg-white/70 rounded-xl neu-card-sm inline-flex items-center gap-2 text-xs font-semibold text-[#536DFE]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#536DFE]" />
                        <span>{imageProgress || 'Reading visible text via OCR...'}</span>
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
                  <div className="space-y-2.5">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#536DFE]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#202B45]">
                        Drag and drop your image file here, or browse
                      </h4>
                      <p className="text-xs text-[#8A99AD] mt-0.5">
                        Supported formats: <strong>PNG, JPG, JPEG</strong> (max 20MB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="neu-btn px-4 py-2 text-xs font-bold text-[#202B45] hover:text-[#536DFE] inline-flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-4 h-4 text-[#536DFE]" />
                      Browse Images
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

            {/* CONTENT PREVIEW & EDITABLE OCR EXTRACTED TEXT */}
            {selectedImage && !isExtractingImage && extractedImageText && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    OCR Transcribed Content ({extractedImageText.trim().split(/\s+/).length} words detected)
                  </span>
                  <span className="text-[10px] text-[#536DFE] font-semibold flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    Editable before submission
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={extractedImageText}
                  onChange={(e) => setExtractedImageText(e.target.value)}
                  className="neu-input w-full p-4 text-xs md:text-sm font-normal leading-relaxed text-[#202B45] resize-y"
                  placeholder="OCR extracted text..."
                />
                <p className="text-[10px] text-[#8A99AD]">
                  Original image asset is preserved for visual inspection and multimodal brand checks. Edit the text above if needed.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#D5DDE7]/70">
              <span className="text-xs text-[#8A99AD] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Image pixels are read via browser-based OCR; image file is preserved for analysis.
              </span>

              <button
                type="submit"
                disabled={isAnalyzing || isExtractingImage || !selectedImage || !extractedImageText.trim()}
                className={`neu-btn-primary px-6 py-2.5 text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-sm self-end sm:self-auto ${
                  (!selectedImage || !extractedImageText.trim() || isExtractingImage) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Image...
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
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-[#202B45]">
                            {activeReview.title}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 text-[#5E6E82] border border-[#D1D9E6]">
                            {activeReview.contentType}
                          </span>
                        </div>
                        <p className="text-xs text-[#8A99AD] mt-1">
                          Mode: {
                            activeReview.submissionMode === 'image'
                              ? 'Image Upload (OCR)'
                              : activeReview.submissionMode === 'document'
                              ? 'Document Ingestion'
                              : 'Direct Text Copy'
                          } • Submitted {activeReview.timestamp}
                        </p>
                      </div>

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

                    {/* Original Visual Image Preview if Image Mode */}
                    {activeReview.originalFile?.previewUrl && (
                      <div className="mb-4 p-3 rounded-2xl bg-white/60 neu-card-sm border border-white flex items-center justify-center">
                        <img
                          src={activeReview.originalFile.previewUrl}
                          alt="Asset visual thumbnail"
                          className="max-h-48 object-contain rounded-xl"
                        />
                      </div>
                    )}

                    {/* Original File Metadata info if file was uploaded */}
                    {activeReview.originalFile && (
                      <div className="mb-4 p-3 rounded-xl bg-white/50 border border-white/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {activeReview.submissionMode === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-[#536DFE]" />
                          ) : (
                            <FileText className="w-4 h-4 text-[#536DFE]" />
                          )}
                          <span className="font-bold text-[#202B45]">{activeReview.originalFile.name}</span>
                        </div>
                        <span className="text-[#8A99AD] font-mono">
                          {activeReview.originalFile.fileType} • {activeReview.originalFile.size}
                        </span>
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

                      {/* 3 Review Decision Action Buttons */}
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
    </div>
  );
}
