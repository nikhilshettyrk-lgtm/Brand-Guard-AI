import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Plus,
  Search,
  FileText,
  Trash2,
  Edit3,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  BookOpen,
  Filter,
  Copy,
  Check,
  Palette,
  Loader2,
  ShieldCheck,
  Image as ImageIcon,
  Star,
  Maximize2
} from 'lucide-react';
import { useBrandGuard } from '../context/BrandGuardContext';
import { extractTextFromFile } from '../utils/documentExtractor';
import {
  validateLogoFile,
  rasterizeSvgToPngDataUrl,
  svgToDataUrl
} from '../utils/logoAssetHelper';

export default function BrandKnowledgeHub() {
  const {
    uploadedDocuments,
    manualGuidelines,
    addUploadedDocument,
    deleteUploadedDocument,
    addManualGuideline,
    updateManualGuideline,
    deleteManualGuideline,
    colorTokens,
    addColorToken,
    selectedOrganisation,
    logoAssets,
    primaryOrgLogo,
    addLogoAsset,
    deleteLogoAsset,
    setPrimaryLogoAsset
  } = useBrandGuard();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Upload state
  const fileInputRef = useRef(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Manual Guideline Modal (Create / Edit)
  const [showGuidelineModal, setShowGuidelineModal] = useState(false);
  const [editingGuidelineId, setEditingGuidelineId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Brand Voice and Tone');
  const [formDescription, setFormDescription] = useState('');
  const [formRules, setFormRules] = useState('');
  const [formPriority, setFormPriority] = useState('Medium');

  // Extracted Text Viewer Modal
  const [viewingDoc, setViewingDoc] = useState(null);
  const [viewingDocRules, setViewingDocRules] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  // Master Logo Asset Modal State
  const logoFileInputRef = useRef(null);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [logoPngBase64, setLogoPngBase64] = useState('');
  const [logoSvgContent, setLogoSvgContent] = useState('');
  const [logoFileType, setLogoFileType] = useState('PNG');
  const [logoName, setLogoName] = useState('');
  const [logoVariant, setLogoVariant] = useState('Primary Master');
  const [logoNotes, setLogoNotes] = useState('');
  const [isPrimaryLogo, setIsPrimaryLogo] = useState(true);
  const [logoError, setLogoError] = useState('');
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [zoomLogoModal, setZoomLogoModal] = useState(null);

  const handleOpenLogoModal = () => {
    setLogoFile(null);
    setLogoPreviewUrl('');
    setLogoPngBase64('');
    setLogoSvgContent('');
    setLogoFileType('PNG');
    setLogoName('');
    setLogoVariant('Primary Master');
    setLogoNotes('');
    setIsPrimaryLogo(logoAssets.length === 0);
    setLogoError('');
    setShowLogoModal(true);
  };

  const handleLogoFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError('');
    setIsProcessingLogo(true);

    try {
      const validation = validateLogoFile(file);
      setLogoFile(file);
      setLogoFileType(validation.extension);

      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      if (!logoName.trim()) {
        setLogoName(`${baseName.replace(/[-_]/g, ' ')} Master Logo`);
      }

      if (validation.extension === 'SVG') {
        const text = await file.text();
        if (!text.includes('<svg') || !text.includes('</svg>')) {
          throw new Error('Invalid SVG file structure. Please upload a valid vector SVG.');
        }
        setLogoSvgContent(text);
        const dataUrl = svgToDataUrl(text);
        setLogoPreviewUrl(dataUrl);

        try {
          const pngUrl = await rasterizeSvgToPngDataUrl(dataUrl, 512, 256);
          const rawBase64 = pngUrl ? pngUrl.replace(/^data:[^;]+;base64,/, '') : '';
          setLogoPngBase64(rawBase64);
        } catch (rasterErr) {
          console.warn('Canvas rasterization fallback:', rasterErr);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const result = evt.target.result;
          setLogoPreviewUrl(result);
          const rawBase64 = result ? result.replace(/^data:[^;]+;base64,/, '') : '';
          setLogoPngBase64(rawBase64);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setLogoError(err.message || 'Failed to process logo file.');
      setLogoFile(null);
      setLogoPreviewUrl('');
    } finally {
      setIsProcessingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleSaveLogoAsset = (e) => {
    e.preventDefault();
    if (!logoPreviewUrl) {
      setLogoError('Please upload an approved PNG or SVG logo first.');
      return;
    }
    if (!logoName.trim()) {
      setLogoError('Please enter a name for this logo asset.');
      return;
    }

    const formatSize = (bytes) => {
      if (!bytes) return '150 KB';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    addLogoAsset({
      name: logoName.trim(),
      fileName: logoFile?.name || `${logoName.toLowerCase().replace(/\s+/g, '-')}.${logoFileType.toLowerCase()}`,
      fileType: logoFileType,
      variant: logoVariant,
      previewUrl: logoPreviewUrl,
      pngBase64: logoPngBase64,
      svgContent: logoSvgContent,
      fileSize: formatSize(logoFile?.size),
      organisation: selectedOrganisation,
      isPrimary: isPrimaryLogo,
      notes: logoNotes.trim() || `Approved ${logoVariant} for ${selectedOrganisation}`
    });

    setShowLogoModal(false);
  };

  // Suggested Categories
  const categories = [
    'Brand Voice and Tone',
    'Terminology',
    'Approved Facts',
    'Restricted Claims',
    'Messaging Rules',
    'Visual Identity',
    'Accessibility'
  ];

  // Priorities
  const priorities = ['Critical', 'High', 'Medium', 'Low'];

  // Handle Document File Upload & Real Extraction
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset messages
    setUploadError('');
    setUploadSuccess('');
    setIsProcessingUpload(true);
    setUploadStatusText(`Extracting text from ${file.name}...`);

    try {
      // Validate file extension
      const validExtensions = ['.pdf', '.docx', '.txt'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        throw new Error(`Unsupported format (${fileExt}). Please upload PDF, DOCX, or TXT.`);
      }

      // Check duplicate
      const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
      };
      const fileSizeStr = formatSize(file.size);

      // Extract text
      const extraction = await extractTextFromFile(file, (pct, msg) => {
        setUploadStatusText(msg);
      });

      // Extract discrete individual rules from document text
      setUploadStatusText(`Extracting individual rules from ${file.name}...`);
      let extractedRules = [];
      let detectedOrg = 'General Workspace';

      try {
        const rulesResponse = await fetch('/api/extract-guideline-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: extraction.text,
            filename: file.name,
            organisation: selectedOrganisation
          })
        });
        if (rulesResponse.ok) {
          const rulesData = await rulesResponse.json();
          if (rulesData.success) {
            extractedRules = rulesData.rules || [];
            detectedOrg = rulesData.organisation || detectedOrg;
          }
        }
      } catch (ruleErr) {
        console.warn('Backend rule extraction fallback:', ruleErr);
      }

      // Save document to context with discrete individual rules
      addUploadedDocument({
        name: file.name,
        fileType: extraction.fileType,
        fileSize: fileSizeStr,
        extractedText: extraction.text,
        organisation: detectedOrg,
        extractedRules
      });

      setUploadSuccess(`Ingested "${file.name}" for ${detectedOrg} (${extractedRules.length} discrete rules extracted).`);
      setTimeout(() => setUploadSuccess(''), 4500);
    } catch (err) {
      setUploadError(err.message || 'Failed to process and extract guideline text.');
    } finally {
      setIsProcessingUpload(false);
      setUploadStatusText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open Add / Edit Guideline Modal
  const openAddGuideline = () => {
    setEditingGuidelineId(null);
    setFormTitle('');
    setFormCategory('Brand Voice and Tone');
    setFormDescription('');
    setFormRules('');
    setFormPriority('Medium');
    setShowGuidelineModal(true);
  };

  const openEditGuideline = (g) => {
    setEditingGuidelineId(g.id);
    setFormTitle(g.title);
    setFormCategory(g.category);
    setFormDescription(g.description || '');
    setFormRules(Array.isArray(g.rules) ? g.rules.join('\n') : (g.rules || ''));
    setFormPriority(g.priority || 'Medium');
    setShowGuidelineModal(true);
  };

  const handleSaveGuideline = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedRules = formRules
      .split('\n')
      .map(r => r.trim())
      .filter(Boolean);

    if (editingGuidelineId) {
      updateManualGuideline(editingGuidelineId, {
        title: formTitle,
        category: formCategory,
        description: formDescription,
        rules: parsedRules.length > 0 ? parsedRules : [formRules],
        priority: formPriority
      });
    } else {
      addManualGuideline({
        title: formTitle,
        category: formCategory,
        description: formDescription,
        rules: parsedRules.length > 0 ? parsedRules : [formRules],
        priority: formPriority
      });
    }

    setShowGuidelineModal(false);
  };

  const handleCopyDocText = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Filtered Manual Guidelines
  const filteredGuidelines = manualGuidelines.filter(g => {
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(g.rules) && g.rules.some(r => r.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    const matchesPriority = selectedPriority === 'All' || g.priority === selectedPriority;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  // Filtered Uploaded Documents
  const filteredDocs = uploadedDocuments.filter(d => {
    return d.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-16">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.docx,.txt"
        className="hidden"
      />
      <input
        type="file"
        ref={logoFileInputRef}
        onChange={handleLogoFileSelect}
        accept=".png,.svg"
        className="hidden"
      />

      {/* Top Banner with Prominent Action Buttons */}
      <div className="neu-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              Brand Governance & Visual Assets
            </span>
            <span className="text-xs text-[#8A99AD] font-medium">
              Org: <strong className="text-[#202B45]">{selectedOrganisation}</strong> • {uploadedDocuments.length} Docs • {logoAssets.length} Logos • {manualGuidelines.length} Rules
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#202B45] tracking-tight">
            Brand Knowledge Hub
          </h2>
          <p className="text-xs md:text-sm text-[#5E6E82] font-medium mt-1">
            Ingest brand rulebooks, register approved master logo assets, and codify compliance policies.
          </p>
        </div>

        {/* Prominent Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenLogoModal}
            className="neu-btn px-3.5 py-2.5 text-xs md:text-sm font-bold text-[#202B45] flex items-center gap-2 hover:text-[#10B981]"
          >
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            Upload Master Logo
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingUpload}
            className="neu-btn px-4 py-2.5 text-xs md:text-sm font-bold text-[#202B45] flex items-center gap-2 hover:text-[#536DFE]"
          >
            {isProcessingUpload ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#536DFE]" />
            ) : (
              <UploadCloud className="w-4 h-4 text-[#536DFE]" />
            )}
            Upload Guidelines (PDF, DOCX, TXT)
          </button>

          <button
            onClick={openAddGuideline}
            className="neu-btn-primary px-4 py-2.5 text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Notifications / Processing Feedback */}
      {isProcessingUpload && (
        <div className="neu-card-sm p-4 bg-[#536DFE]/10 border border-[#536DFE]/30 flex items-center gap-3 animate-in fade-in">
          <Loader2 className="w-5 h-5 animate-spin text-[#536DFE]" />
          <div>
            <p className="text-xs font-bold text-[#202B45]">Processing Document</p>
            <p className="text-[11px] text-[#5E6E82]">{uploadStatusText}</p>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <div className="neu-card-sm p-4 bg-[#10B981]/15 border border-[#10B981]/30 text-[#065F46] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="neu-card-sm p-4 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="neu-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8A99AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search guidelines, rules, terminology..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neu-input w-full pl-10 pr-4 py-2 text-xs text-[#202B45]"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[#5E6E82]">
            <Filter className="w-3.5 h-3.5 text-[#8A99AD]" />
            <span className="font-semibold">Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="neu-input px-3 py-1.5 text-xs font-medium text-[#202B45] cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[#5E6E82] ml-2">
            <span className="font-semibold">Priority:</span>
          </div>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="neu-input px-3 py-1.5 text-xs font-medium text-[#202B45] cursor-pointer"
          >
            <option value="All">All Priorities</option>
            {priorities.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: UPLOADED GUIDELINE DOCUMENTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#202B45]">
              Uploaded Guideline Documents
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#536DFE]/15 text-[#536DFE]">
              {uploadedDocuments.length}
            </span>
          </div>
          <span className="text-xs text-[#8A99AD]">
            Supported: PDF, DOCX, TXT
          </span>
        </div>

        {uploadedDocuments.length === 0 ? (
          <div className="neu-card p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#536DFE] mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#202B45]">No guideline documents uploaded</h4>
            <p className="text-xs text-[#5E6E82] max-w-sm mt-1 mb-4">
              Upload your brand book, design manual, or style guide to extract rules for automated analysis.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="neu-btn px-4 py-2 text-xs font-bold text-[#536DFE] flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              Upload First Document
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="neu-card p-6 text-center text-xs text-[#8A99AD]">
            No uploaded documents match "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="neu-card p-5 flex flex-col justify-between group hover:-translate-y-0.5 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#536DFE]/10 text-[#536DFE] flex items-center justify-center neu-btn">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 text-[#5E6E82] border border-[#D1D9E6]">
                      {doc.fileType}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#202B45] truncate" title={doc.name}>
                    {doc.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[#8A99AD] mt-1 flex-wrap">
                    <span>{doc.fileSize}</span>
                    <span>•</span>
                    <span>Uploaded {doc.uploadDate}</span>
                    {doc.organisation && doc.organisation !== 'General Workspace' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#536DFE]/15 text-[#536DFE]">
                        {doc.organisation}
                      </span>
                    )}
                  </div>

                  {Array.isArray(doc.extractedRules) && doc.extractedRules.length > 0 && (
                    <div className="mt-2.5 flex items-center justify-between text-xs bg-[#10B981]/10 px-2.5 py-1.5 rounded-lg border border-[#10B981]/20">
                      <span className="text-[11px] font-bold text-[#065F46] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        {doc.extractedRules.length} Individual Rules Extracted
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewingDocRules(doc)}
                        className="text-[11px] font-bold text-[#536DFE] hover:underline"
                      >
                        Inspect Rules
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-[#5E6E82] mt-3 line-clamp-2 bg-white/40 p-2.5 rounded-xl border border-white/60 font-mono text-[11px]">
                    {doc.extractedText ? doc.extractedText.slice(0, 140) + '...' : 'No text content.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#D5DDE7]/70 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-[#8A99AD]">
                    {doc.wordCount} words
                  </span>
                  <div className="flex items-center gap-2">
                    {Array.isArray(doc.extractedRules) && doc.extractedRules.length > 0 && (
                      <button
                        onClick={() => setViewingDocRules(doc)}
                        className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#10B981] flex items-center gap-1 hover:text-[#047857]"
                        title="View extracted rules"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Rules ({doc.extractedRules.length})
                      </button>
                    )}
                    <button
                      onClick={() => setViewingDoc(doc)}
                      className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#536DFE] flex items-center gap-1 hover:text-[#4258E8]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Text
                    </button>
                    <button
                      onClick={() => deleteUploadedDocument(doc.id)}
                      className="neu-btn px-2 py-1.5 text-xs font-bold text-[#EF4444] hover:bg-red-50"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: APPROVED MASTER BRAND LOGOS (VISUAL REFERENCE ASSETS) */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#202B45]">
                Approved Brand Master Logos
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#047857]">
                {logoAssets.length}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 text-[#5E6E82] border border-[#D1D9E6]">
                {selectedOrganisation}
              </span>
            </div>
            <p className="text-xs text-[#5E6E82] mt-0.5">
              Official vector SVG and PNG master assets supplied to Gemini multimodal engine for comparative visual verification.
            </p>
          </div>
          <button
            onClick={handleOpenLogoModal}
            className="neu-btn px-3 py-1.5 text-xs font-bold text-[#10B981] hover:text-[#059669] flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Upload Master Logo
          </button>
        </div>

        {logoAssets.length === 0 ? (
          <div className="neu-card p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#10B981] mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#202B45]">No approved master logos on file for {selectedOrganisation}</h4>
            <p className="text-xs text-[#5E6E82] max-w-md mt-1 mb-4">
              Upload your official master logo (PNG or SVG) so Gemini can visually cross-examine submitted creatives against exact brand dimensions, colors, and contours.
            </p>
            <button
              onClick={handleOpenLogoModal}
              className="neu-btn px-4 py-2 text-xs font-bold text-[#10B981] flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Upload First Master Logo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {logoAssets.map((logo) => (
              <div
                key={logo.id}
                className={`neu-card p-5 flex flex-col justify-between group hover:-translate-y-0.5 transition-all border ${
                  logo.isPrimary ? 'border-[#10B981]/50 shadow-sm' : 'border-white/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 text-[#5E6E82] border border-[#D1D9E6]">
                        {logo.fileType}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#536DFE]/15 text-[#536DFE]">
                        {logo.variant}
                      </span>
                    </div>

                    {logo.isPrimary && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#047857] flex items-center gap-1">
                        <Star className="w-3 h-3 fill-[#10B981]" />
                        Primary Reference
                      </span>
                    )}
                  </div>

                  {/* Logo Preview Container with clean backdrop */}
                  <div className="relative h-28 rounded-xl bg-white/90 neu-card-sm border border-white/80 p-3 flex items-center justify-center overflow-hidden mb-3 group/preview">
                    <img
                      src={logo.previewUrl}
                      alt={logo.name}
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setZoomLogoModal(logo)}
                      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/preview:opacity-100 transition-opacity"
                      title="Inspect High-Res Logo"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-[#202B45] truncate" title={logo.name}>
                    {logo.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-[#8A99AD] mt-1 flex-wrap">
                    <span>{logo.fileName}</span>
                    <span>•</span>
                    <span>{logo.fileSize}</span>
                  </div>
                  {logo.notes && (
                    <p className="text-[11px] text-[#5E6E82] mt-2 line-clamp-2 italic">
                      "{logo.notes}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#D5DDE7]/70 flex items-center justify-between text-xs">
                  <div>
                    {!logo.isPrimary ? (
                      <button
                        onClick={() => setPrimaryLogoAsset(logo.id)}
                        className="text-[11px] font-bold text-[#536DFE] hover:underline flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" />
                        Set as Primary
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#059669] font-bold">
                        Active Verification Model
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoomLogoModal(logo)}
                      className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#536DFE] flex items-center gap-1 hover:text-[#4258E8]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => deleteLogoAsset(logo.id)}
                      className="neu-btn px-2 py-1.5 text-xs font-bold text-[#EF4444] hover:bg-red-50"
                      title="Delete logo asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: CODIFIED BRAND GUIDELINES */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#202B45]">
              Codified Brand Guidelines
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#047857]">
              {manualGuidelines.length}
            </span>
          </div>
          <button
            onClick={openAddGuideline}
            className="neu-btn px-3 py-1.5 text-xs font-bold text-[#536DFE] flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>

        {manualGuidelines.length === 0 ? (
          <div className="neu-card p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/70 neu-card-sm flex items-center justify-center text-[#536DFE] mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#202B45]">No codified guidelines defined</h4>
            <p className="text-xs text-[#5E6E82] max-w-sm mt-1 mb-4">
              Add explicit rules for tone, terminology, restricted claims, and messaging to enforce compliance.
            </p>
            <button
              onClick={openAddGuideline}
              className="neu-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add First Guideline
            </button>
          </div>
        ) : filteredGuidelines.length === 0 ? (
          <div className="neu-card p-6 text-center text-xs text-[#8A99AD]">
            No guidelines match the current search or filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredGuidelines.map((g) => (
              <div
                key={g.id}
                className="neu-card p-6 flex flex-col justify-between group hover:-translate-y-0.5 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#536DFE]/15 text-[#536DFE]">
                      {g.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        g.priority === 'Critical'
                          ? 'bg-[#EF4444]/15 text-[#B91C1C]'
                          : g.priority === 'High'
                          ? 'bg-[#F59E0B]/15 text-[#B45309]'
                          : 'bg-[#10B981]/15 text-[#047857]'
                      }`}
                    >
                      {g.priority} Priority
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[#202B45] mt-1">{g.title}</h4>
                  {g.description && (
                    <p className="text-xs text-[#5E6E82] mt-1 font-medium">{g.description}</p>
                  )}

                  {/* Rules list */}
                  <div className="mt-4 space-y-1.5 bg-white/40 p-3.5 rounded-2xl border border-white/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A99AD] block mb-1">
                      Enforced Rules
                    </span>
                    {(Array.isArray(g.rules) ? g.rules : [g.rules]).map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#202B45]">
                        <span className="text-[#536DFE] font-bold mt-0.5">•</span>
                        <span className="font-medium leading-relaxed">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#D5DDE7]/70 flex items-center justify-between text-xs text-[#8A99AD]">
                  <span>Updated: {g.updatedAt || g.createdAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditGuideline(g)}
                      className="neu-btn px-2.5 py-1.5 text-xs font-bold text-[#202B45] hover:text-[#536DFE] flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteManualGuideline(g.id)}
                      className="neu-btn px-2 py-1.5 text-xs font-bold text-[#EF4444] hover:bg-red-50"
                      title="Delete guideline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EXTRACTED TEXT VIEWER MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B45]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-3xl bg-[#E8ECF3] neu-card p-6 md:p-8 border border-white relative max-h-[85vh] flex flex-col shadow-2xl">
            <button
              onClick={() => setViewingDoc(null)}
              className="absolute top-5 right-5 neu-icon-btn !w-9 !h-9 text-[#5E6E82] hover:text-[#202B45]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#536DFE]/15 text-[#536DFE] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#202B45]">{viewingDoc.name}</h3>
                <p className="text-xs text-[#5E6E82]">
                  {viewingDoc.fileType} • {viewingDoc.fileSize} • {viewingDoc.wordCount} words extracted
                </p>
              </div>
            </div>

            {/* Scrollable Text Body */}
            <div className="flex-1 overflow-y-auto neu-input p-4 rounded-2xl text-xs font-mono text-[#202B45] whitespace-pre-wrap leading-relaxed select-text">
              {viewingDoc.extractedText || 'No text extracted.'}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#D5DDE7]/70">
              <button
                onClick={() => handleCopyDocText(viewingDoc.extractedText)}
                className="neu-btn px-3 py-1.5 text-xs font-bold text-[#536DFE] flex items-center gap-1.5"
              >
                {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedText ? 'Copied to Clipboard' : 'Copy Full Text'}
              </button>

              <button
                onClick={() => setViewingDoc(null)}
                className="neu-btn px-4 py-1.5 text-xs font-bold text-[#202B45]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT GUIDELINE MODAL */}
      {showGuidelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B45]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl bg-[#E8ECF3] neu-card p-6 md:p-8 border border-white relative shadow-2xl">
            <button
              onClick={() => setShowGuidelineModal(false)}
              className="absolute top-5 right-5 neu-icon-btn !w-9 !h-9 text-[#5E6E82] hover:text-[#202B45]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold text-[#202B45] mb-1">
              {editingGuidelineId ? 'Edit Brand Guideline' : 'Add Brand Guideline'}
            </h3>
            <p className="text-xs text-[#5E6E82] mb-5">
              Codify specific rules that the compliance engine evaluates during content reviews.
            </p>

            <form onSubmit={handleSaveGuideline} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                  Guideline Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tone of Voice & Conversational Posture"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="neu-input w-full px-3.5 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="neu-input w-full px-3 py-2 text-xs"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                    Enforcement Priority *
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="neu-input w-full px-3 py-2 text-xs"
                  >
                    {priorities.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  placeholder="Summary of why this policy exists and where it applies"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="neu-input w-full px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                  Guideline Rules (One per line) *
                </label>
                <textarea
                  rows={4}
                  placeholder={`Example rules:\n• Restricted claim: Avoid saying "100% guaranteed" or "#1 in market"\n• Terminology: Do not refer to clients as "users"\n• Tone: Maintain an authoritative, confident tone without hyperbole`}
                  value={formRules}
                  onChange={(e) => setFormRules(e.target.value)}
                  className="neu-input w-full p-3 text-xs resize-none"
                  required
                />
                <span className="text-[10px] text-[#8A99AD] mt-1 block">
                  Tip: Put specific prohibited terms in quotes (e.g. "guarantee", "cheap") so the engine flags them precisely.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGuidelineModal(false)}
                  className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-5 py-2 text-xs font-bold"
                >
                  {editingGuidelineId ? 'Save Changes' : 'Create Guideline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW EXTRACTED DISCRETE RULES */}
      {viewingDocRules && (
        <div className="fixed inset-0 z-50 bg-[#202B45]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-card w-full max-w-3xl max-h-[85vh] flex flex-col p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#D5DDE7]/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center neu-btn">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202B45]">
                    Extracted Discrete Rules: {viewingDocRules.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#8A99AD] mt-0.5">
                    <span>Organisation: <strong className="text-[#202B45]">{viewingDocRules.organisation || 'General Workspace'}</strong></span>
                    <span>•</span>
                    <span className="text-[#10B981] font-bold">{viewingDocRules.extractedRules?.length || 0} discrete rules active</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingDocRules(null)}
                className="neu-btn p-2 text-[#5E6E82] hover:text-[#202B45]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 flex-1 overflow-y-auto space-y-3 pr-1">
              {(!viewingDocRules.extractedRules || viewingDocRules.extractedRules.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#8A99AD]">
                  No structured rules could be separated from this document. The full text excerpt will be analyzed as an overarching rulebook.
                </div>
              ) : (
                viewingDocRules.extractedRules.map((rule, idx) => (
                  <div
                    key={rule.id || idx}
                    className="p-4 rounded-xl neu-card-sm border border-white/80 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#202B45]">
                          {rule.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#536DFE]/15 text-[#536DFE]">
                          {rule.category}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rule.priority === 'Critical'
                            ? 'bg-[#EF4444]/15 text-[#B91C1C]'
                            : rule.priority === 'High'
                            ? 'bg-[#F59E0B]/15 text-[#B45309]'
                            : 'bg-[#10B981]/15 text-[#047857]'
                        }`}
                      >
                        {rule.priority} Priority
                      </span>
                    </div>

                    <p className="text-xs text-[#5E6E82] leading-relaxed">
                      {rule.ruleText}
                    </p>

                    <div className="pt-2 border-t border-[#D5DDE7]/50 flex items-center justify-between text-[10px] text-[#8A99AD]">
                      <span>Source: {rule.sourceRef || viewingDocRules.name}</span>
                      <span>Target: {rule.organisation || 'Workspace'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#D5DDE7]/70">
              <button
                onClick={() => setViewingDocRules(null)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#202B45]"
              >
                Close Rule Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: UPLOAD & REGISTER APPROVED MASTER LOGO */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 bg-[#202B45]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neu-card w-full max-w-lg p-6 md:p-8 space-y-4 border border-white relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowLogoModal(false)}
              className="absolute top-5 right-5 neu-icon-btn !w-9 !h-9 text-[#5E6E82] hover:text-[#202B45]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center neu-btn">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#202B45]">
                  Register Master Brand Logo
                </h3>
                <p className="text-xs text-[#5E6E82]">
                  Target Organisation: <strong>{selectedOrganisation}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveLogoAsset} className="space-y-4 pt-2">
              {/* Dropzone for logo */}
              <div>
                <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                  Logo Asset File (PNG or SVG) *
                </label>
                <div
                  onClick={() => logoFileInputRef.current?.click()}
                  className="neu-input p-5 rounded-2xl border-2 border-dashed border-[#D1D9E6] hover:border-[#536DFE] transition-all cursor-pointer text-center bg-white/40 flex flex-col items-center justify-center group"
                >
                  {isProcessingLogo ? (
                    <div className="flex flex-col items-center gap-2 py-3">
                      <Loader2 className="w-7 h-7 animate-spin text-[#536DFE]" />
                      <span className="text-xs font-semibold text-[#5E6E82]">Processing & validating logo format...</span>
                    </div>
                  ) : logoPreviewUrl ? (
                    <div className="space-y-2 w-full flex flex-col items-center">
                      <div className="h-24 max-w-full p-2 rounded-xl bg-white/90 border border-white flex items-center justify-center">
                        <img
                          src={logoPreviewUrl}
                          alt="Uploaded Logo Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#10B981] font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{logoFile?.name || 'Logo Loaded'} ({logoFileType})</span>
                      </div>
                      <span className="text-[10px] text-[#536DFE] hover:underline">
                        Click to choose a different logo
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 py-3">
                      <UploadCloud className="w-8 h-8 text-[#536DFE] mx-auto group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-bold text-[#202B45]">
                        Click or drag logo file here
                      </p>
                      <p className="text-[11px] text-[#8A99AD]">
                        Supports PNG or SVG (Max 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {logoError && (
                <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#B91C1C] text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{logoError}</span>
                </div>
              )}

              {/* Logo Name */}
              <div>
                <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                  Logo Asset Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Horizontal Lockup"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  className="neu-input w-full px-3.5 py-2 text-xs font-bold text-[#202B45]"
                  required
                />
              </div>

              {/* Variant and Primary Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                    Asset Variant *
                  </label>
                  <select
                    value={logoVariant}
                    onChange={(e) => setLogoVariant(e.target.value)}
                    className="neu-input w-full px-3 py-2 text-xs font-bold text-[#202B45]"
                  >
                    <option value="Primary Master">Primary Master Logo</option>
                    <option value="Secondary / Mark">Secondary / Icon Mark</option>
                    <option value="Dark Theme">Dark Theme Lockup</option>
                    <option value="Light / Monochrome">Monochrome / White</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white/60 neu-card-sm border border-white">
                    <input
                      type="checkbox"
                      checked={isPrimaryLogo}
                      onChange={(e) => setIsPrimaryLogo(e.target.checked)}
                      className="w-4 h-4 rounded text-[#10B981] focus:ring-[#10B981] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#202B45]">
                      Primary Verification Reference
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-[#202B45] uppercase tracking-wider block mb-1">
                  Usage Guidelines & Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minimum clear space 20px, do not place on busy backgrounds"
                  value={logoNotes}
                  onChange={(e) => setLogoNotes(e.target.value)}
                  className="neu-input w-full px-3.5 py-2 text-xs text-[#202B45]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D5DDE7]/70">
                <button
                  type="button"
                  onClick={() => setShowLogoModal(false)}
                  className="neu-btn px-4 py-2 text-xs font-bold text-[#5E6E82]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!logoPreviewUrl || isProcessingLogo}
                  className={`neu-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 ${
                    !logoPreviewUrl || isProcessingLogo ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Save Approved Logo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ZOOM HIGH-RES LOGO */}
      {zoomLogoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="neu-card max-w-2xl w-full p-6 bg-[#E8ECF3] border border-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#202B45]">{zoomLogoModal.name}</h3>
                <p className="text-xs text-[#5E6E82]">
                  {zoomLogoModal.fileType} • {zoomLogoModal.variant} • {zoomLogoModal.organisation}
                </p>
              </div>
              <button
                onClick={() => setZoomLogoModal(null)}
                className="neu-btn p-2 text-[#5E6E82] hover:text-[#202B45]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-64 rounded-2xl bg-white/95 p-6 border border-white flex items-center justify-center overflow-hidden">
              <img
                src={zoomLogoModal.previewUrl}
                alt={zoomLogoModal.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {zoomLogoModal.notes && (
              <p className="text-xs text-[#5E6E82] italic bg-white/60 p-3 rounded-xl border border-white">
                "{zoomLogoModal.notes}"
              </p>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setZoomLogoModal(null)}
                className="neu-btn px-4 py-2 text-xs font-bold text-[#202B45]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
