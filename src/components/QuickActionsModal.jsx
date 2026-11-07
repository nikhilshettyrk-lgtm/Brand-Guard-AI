import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';
import { analyzeContentCompliance } from '../services/analysisEngine';
import { extractTextFromFile } from '../utils/documentExtractor';

export default function QuickActionsModal({
  isOpen,
  mode, // 'upload-guidelines' | 'review-content'
  onClose,
  onNavigate
}) {
  const {
    addUploadedDocument,
    manualGuidelines,
    uploadedDocuments,
    addReviewSubmission,
    settings
  } = useBrandGuard();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [guidelineName, setGuidelineName] = useState('');

  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewInput, setReviewInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleUploadGuideline = async () => {
    if (!selectedFile) {
      setErrorMessage('Please choose or drop a guideline file (PDF, DOCX, TXT).');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const extraction = await extractTextFromFile(selectedFile);
      const title = guidelineName || selectedFile.name;

      addUploadedDocument({
        name: title,
        fileType: extraction.fileType,
        fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`,
        extractedText: extraction.text
      });

      setIsProcessing(false);
      setSuccessMessage(`Guideline "${title}" successfully ingested into workspace.`);
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
        if (onNavigate) onNavigate('knowledge-hub');
      }, 1200);
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to extract text from guideline file.');
    }
  };

  const handleQuickReview = async (e) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewInput.trim()) {
      setErrorMessage('Please provide both an asset title and copy.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const analysisResult = await analyzeContentCompliance({
        content: reviewInput,
        title: reviewTitle,
        contentType: 'Marketing Copy',
        guidelines: manualGuidelines,
        uploadedDocuments: uploadedDocuments,
        sensitivityThreshold: settings.sensitivity || 85
      });

      addReviewSubmission({
        title: reviewTitle,
        contentType: 'Marketing Copy',
        submissionMode: 'text',
        originalFile: null,
        extractedText: reviewInput,
        department: 'Marketing',
        status: analysisResult.status,
        score: analysisResult.score !== null ? analysisResult.score : 0,
        summary: analysisResult.summary,
        checks: analysisResult.checks,
        violations: analysisResult.violations,
        passedRules: analysisResult.passedRules
      });

      setIsProcessing(false);
      setSuccessMessage('Content successfully analyzed.');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
        if (onNavigate) onNavigate('content-review');
      }, 1200);
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Analysis encountered an error.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B45]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-3xl bg-[#E8ECF3] neu-card p-6 md:p-8 border border-white relative shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 neu-icon-btn !w-9 !h-9 text-[#5E6E82] hover:text-[#202B45]"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'upload-guidelines' && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#202B45]">Upload Brand Guidelines</h3>
                <p className="text-xs text-[#5E6E82]">
                  Ingest PDF, DOCX, or TXT rulebooks into BrandGuard Knowledge Hub
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#202B45] mb-1.5 uppercase tracking-wider">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Brand Guidelines"
                  value={guidelineName}
                  onChange={(e) => setGuidelineName(e.target.value)}
                  className="neu-input w-full px-3.5 py-2 text-xs"
                />
              </div>

              {/* Upload Dropzone */}
              <label
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    setSelectedFile(f);
                    if (!guidelineName) setGuidelineName(f.name);
                  }
                }}
                className={`p-6 rounded-2xl text-center border-2 border-dashed transition-all cursor-pointer block ${
                  dragActive
                    ? 'border-[#536DFE] bg-[#536DFE]/5'
                    : selectedFile
                    ? 'border-[#10B981] bg-[#10B981]/5'
                    : 'border-[#BCC5D4] bg-[#E8ECF3] neu-input'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      if (!guidelineName) setGuidelineName(f.name);
                    }
                  }}
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-white/80 neu-card-sm flex items-center justify-center text-[#536DFE] mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#202B45]">
                  {selectedFile ? selectedFile.name : 'Click to browse or drop guideline file here'}
                </p>
                <p className="text-xs text-[#8A99AD] mt-1">
                  Supports PDF, DOCX, and TXT files
                </p>
              </label>

              {successMessage ? (
                <div className="p-3 rounded-xl bg-[#10B981]/15 text-[#065F46] text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  {successMessage}
                </div>
              ) : (
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={onClose}
                    className="neu-btn px-4 py-2.5 text-xs font-bold text-[#5E6E82]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadGuideline}
                    disabled={isProcessing}
                    className="neu-btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting Text...
                      </>
                    ) : (
                      'Ingest Guidelines'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'review-content' && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#202B45]">Review New Content</h3>
                <p className="text-xs text-[#5E6E82]">
                  Run real compliance checks against your saved brand guidelines
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleQuickReview} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#202B45] mb-1.5 uppercase tracking-wider">
                  Asset Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Social Campaign Headline"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="neu-input w-full px-3.5 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B45] mb-1.5 uppercase tracking-wider">
                  Marketing Copy / Headline *
                </label>
                <textarea
                  rows={3}
                  value={reviewInput}
                  onChange={(e) => setReviewInput(e.target.value)}
                  placeholder="Paste ad copy, email headline, or campaign statement..."
                  className="neu-input w-full p-3.5 text-xs resize-none"
                  required
                />
              </div>

              {successMessage ? (
                <div className="p-3 rounded-xl bg-[#10B981]/15 text-[#065F46] text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  {successMessage}
                </div>
              ) : (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="neu-btn px-4 py-2.5 text-xs font-bold text-[#5E6E82]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="neu-btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Run Analysis
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
