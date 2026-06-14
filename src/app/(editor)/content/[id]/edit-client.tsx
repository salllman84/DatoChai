"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, AlertCircle, Loader2, Trash2, CheckCircle2, 
  Settings, Briefcase, FileJson, Share2, TrendingUp, UploadCloud, Globe, Save, Send, Tags, Image as ImageIcon,
  Plus, Undo, Redo, LayoutPanelLeft, Laptop, Tablet, Smartphone, ExternalLink, 
  Heading, List, Quote, Code, Film, Table as TableIcon, Check, ChevronDown, PlaySquare, Type, LayoutTemplate,
  PaintBucket, Palette, Maximize, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { updateArticle, setArticleStatus } from "@/lib/actions/content";
import { UploadDropzone, UploadButton } from "@/lib/uploadthing";
import "@uploadthing/react/styles.css";
import RichTextEditor from "@/components/admin/editor/rich-text-editor";
import { Editor } from "@tiptap/react";

const stripHtml = (html: string) => {
  if (typeof window === 'undefined') return html.replace(/<[^>]*>?/gm, '');
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

export default function EditArticleClient({ post, rawText }: { post: any, rawText: string }) {
  const router = useRouter();
  
  // ARCHITECTURE STATES
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isPublishPanelOpen, setIsPublishPanelOpen] = useState(false);
  const [isPreviewDropdownOpen, setIsPreviewDropdownOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  // POST VS BLOCK SIDEBAR STATES
  const [masterTab, setMasterTab] = useState<'post' | 'block'>('post');
  const [activeNode, setActiveNode] = useState<{type: string, attrs: any}>({ type: 'paragraph', attrs: {} });
  const [openAccordions, setOpenAccordions] = useState<string[]>(['typography', 'color', 'image-settings', 'image-styles', 'image-duotone', 'table-settings']);
  const toggleAccordion = (name: string) => setOpenAccordions(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  // APP STATES
  const [currentStatus, setCurrentStatus] = useState(post.status || "DRAFT");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState("settings"); 
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(""); 
  
  // DATA STATES
  const [title, setTitle] = useState(post.title || "");
  const [content, setContent] = useState(rawText);
  const [slug, setSlug] = useState(post.slug || "");
  const [seoTitle, setSeoTitle] = useState(post.seo?.title || "");
  const [seoDesc, setSeoDesc] = useState(post.seo?.description || "");
  const [focusKeyword, setFocusKeyword] = useState(post.seo?.focusKeyphrase || "");
  const [featuredImage, setFeaturedImage] = useState(post.featuredImage || ""); 
  
  // ADVANCED & METADATA STATES
  const [robots, setRobots] = useState<string[]>(['index']); 
  const [socialImage, setSocialImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState(post.seo?.canonicalUrl || "");
  const [redirectUrl, setRedirectUrl] = useState(""); 
  const [tags, setTags] = useState("");
  
  // FIXED: Multiple Categories Array
  const [categories, setCategories] = useState<string[]>(['Uncategorized']);
  
  // FIXED: Visibility & Publishing Engine
  const [visibility, setVisibility] = useState("Public");
  const [postPassword, setPostPassword] = useState("");
  const [publishMode, setPublishMode] = useState("Immediate");
  const [publishDate, setPublishDate] = useState("");
  
  // FIXED: Schema Engine
  const [schemaType, setSchemaType] = useState("Article");

  const [seoScore, setSeoScore] = useState(post.seo?.seoScore || 0);

  // AUTOMATION ENGINE
  useEffect(() => {
    if (!slug && title) setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    if (!seoTitle && title) setSeoTitle(title);

    let score = 0;
    const plainText = stripHtml(content);
    const keyword = focusKeyword.trim().toLowerCase();
    
    if (keyword) {
      score += 15;
      if ((seoTitle || title).toLowerCase().includes(keyword)) score += 20;
      if (seoDesc.toLowerCase().includes(keyword)) score += 20;
      if (plainText.toLowerCase().includes(keyword)) score += 20;
    }
    if ((seoTitle || title).length >= 40 && (seoTitle || title).length <= 60) score += 10;
    if (seoDesc.length >= 120 && seoDesc.length <= 160) score += 5;
    if (plainText.split(/\s+/).filter(w => w.length > 0).length >= 300) score += 10;
    setSeoScore(score);
  }, [title, content, seoTitle, seoDesc, focusKeyword, slug]);

  const toggleCategory = (cat: string) => {
    setCategories(prev => {
      if (prev.includes(cat)) {
        const newCats = prev.filter(c => c !== cat);
        return newCats.length === 0 ? ['Uncategorized'] : newCats;
      }
      return [...prev.filter(c => c !== 'Uncategorized'), cat];
    });
  };

  const handleRobotToggle = (value: string) => {
    setRobots(prev => {
      if (value === 'index' && !prev.includes('index')) return [...prev.filter(r => r !== 'noindex'), 'index'];
      if (value === 'noindex' && !prev.includes('noindex')) return [...prev.filter(r => r !== 'index'), 'noindex'];
      return prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value];
    });
  };

  const handleSave = async (formData?: FormData) => {
    setError(""); setSuccessMsg("");
    if (!title.trim() || !stripHtml(content).trim()) { setError("Title and content are required."); return; }

    setIsSaving(true);
    const data = formData || new FormData(document.getElementById("editor-form") as HTMLFormElement);
    const result = await updateArticle(data);
    if (result?.error) setError(result.error);
    else { setSuccessMsg("Draft saved"); setTimeout(() => setSuccessMsg(""), 2000); }
    setIsSaving(false);
  };

  const handlePublishToggle = async () => {
    setIsPublishing(true);
    await handleSave();
    
    // If it's already published, we just update it. If it's a draft, we publish it.
    const newStatus = "PUBLISHED"; 
    const result = await setArticleStatus(post.id, newStatus);
    
    if (result?.error) {
      setError(result.error);
    } else { 
      setCurrentStatus("PUBLISHED"); // Instantly updates UI button to "Update"
      setSuccessMsg(`Post is now live!`); 
      setTimeout(() => { setSuccessMsg(""); setIsPublishPanelOpen(false); }, 2000); 
      router.refresh(); 
    }
    setIsPublishing(false);
  };

  const handleContextUpdate = (context: { type: string, attrs: any }) => {
    setActiveNode(context);
    setMasterTab('block');
  };

  const updateActiveNode = (attrs: any) => {
    if (!editorInstance) return;
    if (activeNode.type === 'image') editorInstance.commands.updateAttributes('image', attrs);
    if (activeNode.type === 'heading') editorInstance.commands.updateAttributes('heading', attrs);
    if (activeNode.type === 'paragraph') editorInstance.commands.updateAttributes('paragraph', attrs);
    setActiveNode(prev => ({ ...prev, attrs: { ...prev.attrs, ...attrs } }));
  };

  const displaySeoTitle = seoTitle || title || "Your Awesome Article Title Here";
  const displaySlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || "auto-generated-from-title";

  return (
    <div className="h-screen bg-[#0f172a] flex flex-col font-sans overflow-hidden">
      
      {/* ================= 1. GUTENBERG TOP HEADER ================= */}
      <header className="h-[60px] bg-white dark:bg-[#0d1424] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-2">
          <Link href="/content" className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Back"><ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" /></Link>
          <button onClick={() => setIsBlockMenuOpen(!isBlockMenuOpen)} className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${isBlockMenuOpen ? 'bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`} title="Toggle Block Inserter"><Plus className={`w-5 h-5 transition-transform ${isBlockMenuOpen ? 'rotate-45' : ''}`} /></button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <button onClick={() => editorInstance?.chain().focus().undo().run()} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Undo"><Undo className="w-5 h-5" /></button>
          <button onClick={() => editorInstance?.chain().focus().redo().run()} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" title="Redo"><Redo className="w-5 h-5" /></button>
        </div>

        <div className="hidden md:flex items-center text-sm text-slate-500 font-medium">
          {isSaving ? "Saving..." : successMsg ? successMsg : currentStatus === 'PUBLISHED' ? "Published" : "Saved to draft"}
        </div>

        <div className="flex items-center gap-2">
          {/* Dynamically Hide Save Draft if already published */}
          {currentStatus !== 'PUBLISHED' && (
            <button onClick={() => handleSave()} disabled={isSaving} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50">Save draft</button>
          )}

          <div className="relative">
            <button onClick={() => setIsPreviewDropdownOpen(!isPreviewDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
              {previewMode === 'desktop' ? <Laptop className="w-4 h-4"/> : previewMode === 'tablet' ? <Tablet className="w-4 h-4"/> : <Smartphone className="w-4 h-4"/>}
            </button>
            {isPreviewDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                <button onClick={() => { setPreviewMode('desktop'); setIsPreviewDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><Laptop className="w-4 h-4"/> Desktop {previewMode === 'desktop' && <Check className="w-4 h-4 ml-auto text-blue-500"/>}</button>
                <button onClick={() => { setPreviewMode('tablet'); setIsPreviewDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><Tablet className="w-4 h-4"/> Tablet {previewMode === 'tablet' && <Check className="w-4 h-4 ml-auto text-blue-500"/>}</button>
                <button onClick={() => { setPreviewMode('mobile'); setIsPreviewDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><Smartphone className="w-4 h-4"/> Mobile {previewMode === 'mobile' && <Check className="w-4 h-4 ml-auto text-blue-500"/>}</button>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                <Link href={`/article/${slug}`} target="_blank" onClick={() => setIsPreviewDropdownOpen(false)} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"><ExternalLink className="w-4 h-4"/> Preview in new tab</Link>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold border ${seoScore >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : seoScore >= 50 ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
            <TrendingUp className="w-4 h-4"/> {seoScore} / 100
          </div>

          <button onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsPublishPanelOpen(false); }} className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${isSettingsOpen ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}><LayoutPanelLeft className="w-5 h-5 rotate-180" /></button>
          
          <button onClick={() => { setIsPublishPanelOpen(true); setIsSettingsOpen(false); }} className="bg-[#0073aa] hover:bg-[#005177] text-white text-sm font-medium px-4 py-2 rounded transition-colors">
            {currentStatus === 'PUBLISHED' ? 'Update' : 'Publish'}
          </button>
        </div>
      </header>

      {/* ================= 2. WORKSPACE AREA ================= */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* --- LEFT: BLOCK INSERTER --- */}
        {isBlockMenuOpen && (
          <aside className="w-[300px] bg-white dark:bg-[#0d1424] border-r border-slate-200 dark:border-slate-800/80 flex flex-col flex-shrink-0 z-40 animate-in slide-in-from-left-4 duration-200 shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Blocks</h2></div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">TEXT</h3>
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button type="button" onClick={() => { editorInstance?.chain().focus().setParagraph().run(); setIsBlockMenuOpen(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"><Type className="w-6 h-6 mb-2"/> <span className="text-[10px]">Paragraph</span></button>
                <button type="button" onClick={() => { editorInstance?.chain().focus().toggleHeading({ level: 2 }).run(); setIsBlockMenuOpen(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"><Heading className="w-6 h-6 mb-2"/> <span className="text-[10px]">Heading</span></button>
                <button type="button" onClick={() => { editorInstance?.chain().focus().toggleBulletList().run(); setIsBlockMenuOpen(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"><List className="w-6 h-6 mb-2"/> <span className="text-[10px]">List</span></button>
                <button type="button" onClick={() => { editorInstance?.chain().focus().toggleBlockquote().run(); setIsBlockMenuOpen(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"><Quote className="w-6 h-6 mb-2"/> <span className="text-[10px]">Quote</span></button>
                <button type="button" onClick={() => { editorInstance?.chain().focus().toggleCodeBlock().run(); setIsBlockMenuOpen(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"><Code className="w-6 h-6 mb-2"/> <span className="text-[10px]">Code</span></button>
              </div>

              <h3 className="text-xs font-semibold text-slate-400 mb-3">MEDIA & DESIGN</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300 cursor-pointer overflow-hidden"><ImageIcon className="w-6 h-6 mb-2"/> <span className="text-[10px]">Image</span><div className="absolute inset-0 opacity-0 cursor-pointer"><UploadButton endpoint="imageUploader" onClientUploadComplete={(res) => { if (res && res[0]) { editorInstance?.chain().focus().setImage({ src: res[0].url }).run(); setIsBlockMenuOpen(false); } }} onUploadError={() => alert("Upload failed")} /></div></div>
                <div className="relative flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300 cursor-pointer overflow-hidden"><Film className="w-6 h-6 mb-2"/> <span className="text-[10px]">Video</span><div className="absolute inset-0 opacity-0 cursor-pointer"><UploadButton endpoint="videoUploader" onClientUploadComplete={(res) => { if (res && res[0]) { editorInstance?.chain().focus().insertContent({ type: 'video', attrs: { src: res[0].url } }).run(); setIsBlockMenuOpen(false); } }} onUploadError={() => alert("Upload failed")} /></div></div>
                <button type="button" onClick={() => { const url = prompt('YouTube URL'); if (url) { editorInstance?.commands.setYoutubeVideo({ src: url }); setIsBlockMenuOpen(false); } }} className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"><PlaySquare className="w-6 h-6 mb-2"/> <span className="text-[10px]">YouTube</span></button>
                <button type="button" onClick={() => { editorInstance?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setIsBlockMenuOpen(false); }} className="flex flex-col items-center justify-center p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"><TableIcon className="w-6 h-6 mb-2"/> <span className="text-[10px]">Table</span></button>
              </div>
            </div>
          </aside>
        )}

        {/* --- CENTER: MAIN CANVAS --- */}
        <form id="editor-form" action={handleSave} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative bg-white dark:bg-[#0b1120]">
          <input type="hidden" name="id" value={post.id} />
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="content" value={content} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="featuredImage" value={featuredImage} />
          <input type="hidden" name="focusKeyword" value={focusKeyword} />
          <input type="hidden" name="seoTitle" value={seoTitle} />
          <input type="hidden" name="seoDescription" value={seoDesc} />
          <input type="hidden" name="seoScore" value={seoScore} />
          <input type="hidden" name="robotsMeta" value={robots.join(',')} />
          <input type="hidden" name="socialImage" value={socialImage} />
          <input type="hidden" name="canonicalUrl" value={canonicalUrl} />
          <input type="hidden" name="redirectUrl" value={redirectUrl} />
          <input type="hidden" name="tags" value={tags} />
          <input type="hidden" name="categories" value={categories.join(',')} />
          <input type="hidden" name="visibility" value={visibility} />
          <input type="hidden" name="password" value={postPassword} />
          <input type="hidden" name="publishTime" value={publishMode === 'Immediate' ? 'Immediate' : publishDate} />
          <input type="hidden" name="schemaType" value={schemaType} />

          <div className="max-w-[1000px] mx-auto py-10 px-8 lg:px-12 mt-8">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add title" className="w-full bg-transparent text-[48px] font-black text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none mb-10 tracking-tight" />
            <RichTextEditor content={content} onChange={setContent} onEditorReady={setEditorInstance} onContextUpdate={handleContextUpdate} previewMode={previewMode} />
          </div>
        </form>

        {/* --- RIGHT: PRE-PUBLISH PANEL --- */}
        {isPublishPanelOpen && (
          <aside className="w-[350px] bg-white dark:bg-[#0d1424] border-l border-slate-200 dark:border-slate-800/80 flex flex-col flex-shrink-0 z-40 animate-in slide-in-from-right-4 shadow-2xl absolute right-0 h-[calc(100vh-60px)]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Are you ready to {currentStatus === 'PUBLISHED' ? 'update' : 'publish'}?</h2>
              <button onClick={() => { setIsPublishPanelOpen(false); setIsSettingsOpen(true); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">Double-check your settings before {currentStatus === 'PUBLISHED' ? 'updating' : 'publishing'}.</p>
              <div className="space-y-6">
                
                {/* Visibility Settings */}
                <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer">
                    Visibility: <span className="font-normal text-slate-500 flex items-center gap-1">{visibility} <ChevronDown className="w-4 h-4"/></span>
                  </label>
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full mt-2 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                    <option value="Public">Public - Visible to everyone</option>
                    <option value="Private">Private - Only admins</option>
                    <option value="Password">Password protected</option>
                  </select>
                  {visibility === 'Password' && (
                    <input type="password" value={postPassword} onChange={(e) => setPostPassword(e.target.value)} placeholder="Enter secure password..." className="w-full mt-2 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-700 dark:text-slate-300 focus:border-[#0073aa] focus:outline-none" />
                  )}
                </div>

                {/* Publish Scheduling */}
                <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    Publish: <span className="font-normal text-slate-500 flex items-center gap-1">{publishMode} <ChevronDown className="w-4 h-4"/></span>
                  </label>
                  <select value={publishMode} onChange={(e) => setPublishMode(e.target.value)} className="w-full mt-2 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                    <option value="Immediate">Immediately</option>
                    <option value="Scheduled">Schedule for later</option>
                  </select>
                  {publishMode === 'Scheduled' && (
                    <input type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="w-full mt-2 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm text-slate-700 dark:text-slate-300" />
                  )}
                </div>

                {/* Categories */}
                <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-3">
                    Categories
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-2 bg-slate-50 dark:bg-[#0b1120]">
                    {['Uncategorized', '4D Ramalan', 'News'].map(cat => (
                      <label key={cat} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={categories.includes(cat)} onChange={() => toggleCategory(cat)} className="rounded border-slate-300 dark:border-slate-600" /> {cat}
                      </label>
                    ))}
                  </div>
                </div>

              </div>
              <div className="mt-10 flex flex-col gap-3">
                <button onClick={handlePublishToggle} disabled={isPublishing} className="w-full bg-[#0073aa] hover:bg-[#005177] text-white py-3 rounded text-sm font-medium flex items-center justify-center gap-2">
                  {isPublishing ? <Loader2 className="w-4 h-4 animate-spin"/> : null} 
                  {currentStatus === 'PUBLISHED' ? 'Update' : 'Publish'}
                </button>
                <button onClick={() => { setIsPublishPanelOpen(false); setIsSettingsOpen(true); }} className="w-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 py-3 rounded text-sm font-medium">Cancel</button>
              </div>
            </div>
          </aside>
        )}

        {/* --- RIGHT: INSPECTOR SIDEBAR (POST VS BLOCK) --- */}
        {isSettingsOpen && !isPublishPanelOpen && (
          <aside className="w-[350px] bg-white dark:bg-[#0d1424] border-l border-slate-200 dark:border-slate-800/80 flex flex-col flex-shrink-0 z-30 animate-in slide-in-from-right-4">
            
            <div className="flex border-b border-slate-200 dark:border-slate-800/80 flex-shrink-0">
              <button type="button" onClick={() => setMasterTab('post')} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${masterTab === 'post' ? 'border-[#0073aa] text-[#0073aa]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Post</button>
              <button type="button" onClick={() => setMasterTab('block')} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${masterTab === 'block' ? 'border-[#0073aa] text-[#0073aa]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Block</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-transparent">
              
              {/* ================= POST TAB ================= */}
              {masterTab === 'post' && (
                <>
                  <div className="flex border-b border-slate-200 dark:border-slate-800/80 flex-shrink-0 px-2 bg-slate-50 dark:bg-[#0b1120]/50">
                    <button type="button" onClick={() => setActiveTab('settings')} className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'settings' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Post Settings"><Settings className="w-4 h-4"/></button>
                    <button type="button" onClick={() => setActiveTab('advanced')} className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'advanced' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Rank Math SEO"><Briefcase className="w-4 h-4"/></button>
                    <button type="button" onClick={() => setActiveTab('schema')} className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'schema' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Schema Markup"><FileJson className="w-4 h-4"/></button>
                    <button type="button" onClick={() => setActiveTab('social')} className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${activeTab === 'social' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Social Media Image"><Share2 className="w-4 h-4"/></button>
                  </div>

                  <div className="p-4">
                    {activeTab === 'settings' && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Featured image</h3>
                          {featuredImage ? (
                            <div className="relative w-full aspect-video rounded overflow-hidden border border-slate-200 dark:border-slate-700 group cursor-pointer"><img src={featuredImage} alt="Featured" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center"><button type="button" onClick={() => setFeaturedImage("")} className="bg-white/20 hover:bg-white/40 text-white px-4 py-1.5 rounded text-xs font-semibold backdrop-blur-sm">Remove</button></div></div>
                          ) : (
                            <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 border-dashed rounded p-6 flex flex-col items-center justify-center text-center"><div className="relative overflow-hidden cursor-pointer"><div className="text-sm text-[#0073aa] hover:underline font-medium cursor-pointer pointer-events-none">Set featured image</div><div className="absolute inset-0 opacity-0 cursor-pointer"><UploadDropzone endpoint="imageUploader" onClientUploadComplete={(res) => { if (res && res[0]) setFeaturedImage(res[0].url); }} appearance={{ button: "w-full h-full cursor-pointer", allowedContent: "hidden", container: "p-0 border-none", label: "hidden" }} /></div></div></div>
                          )}
                        </div>
                        <div className="w-full h-px bg-slate-200 dark:bg-slate-800"></div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Categories</h3>
                          <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded p-2 bg-white dark:bg-[#0b1120]">
                            {['Uncategorized', '4D Ramalan', 'News'].map(cat => (
                              <label key={cat} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                <input type="checkbox" checked={categories.includes(cat)} onChange={() => toggleCategory(cat)} className="rounded border-slate-300 dark:border-slate-600" /> {cat}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Tags</h3>
                          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Add new tag" className="w-full bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-sm rounded p-2 focus:border-[#0073aa] focus:outline-none" />
                        </div>
                      </div>
                    )}
                    {activeTab === 'advanced' && (
                      <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded p-4 shadow-sm"><p className="text-xs text-slate-500 mb-1">Preview</p><p className="text-sm text-[#1a0dab] font-medium truncate hover:underline cursor-pointer">{displaySeoTitle}</p><p className="text-xs text-green-700 dark:text-emerald-500 truncate mb-1">https://yoursite.com/{displaySlug}</p><p className="text-[13px] text-[#4d5156] dark:text-slate-400 line-clamp-2">{seoDesc || stripHtml(content).substring(0, 160) || "Auto-generating preview..."}</p></div>
                        <div><label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">Focus Keyword</label><input type="text" value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} className="w-full bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-sm rounded p-2 focus:border-[#0073aa] focus:outline-none" /></div>
                        <div><label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">SEO Title</label><input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-sm rounded p-2 focus:border-[#0073aa] focus:outline-none" /></div>
                        <div><label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">Meta Description</label><textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={3} className="w-full bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-sm rounded p-2 focus:border-[#0073aa] focus:outline-none resize-none"></textarea></div>
                      </div>
                    )}
                    {activeTab === 'schema' && (
                      <div className="animate-in fade-in duration-200 text-center flex flex-col items-center mt-6">
                        <div className="w-16 h-16 bg-[#0b1120] border border-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><FileJson className="w-8 h-8 text-slate-600" /></div>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed px-4">Configure Schema Markup to display rich results in SERPs.</p>
                        
                        <div className="w-full bg-[#0b1120] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm text-left">
                          <label className="text-xs font-semibold text-slate-400">Select Schema Type:</label>
                          <select value={schemaType} onChange={(e) => setSchemaType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-sm rounded p-2 focus:border-[#0073aa] focus:outline-none text-slate-200 cursor-pointer">
                            <option value="Article">Article (BlogPosting)</option>
                            <option value="NewsArticle">News Article</option>
                            <option value="FAQPage">FAQ Page</option>
                            <option value="Recipe">Recipe</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {activeTab === 'social' && (
                      <div className="animate-in fade-in duration-200 mt-2">
                        <p className="text-slate-400 text-[13px] mb-6 leading-relaxed">Edit the thumbnail displayed when shared on Facebook or X (Twitter).</p>
                        {socialImage ? (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 group shadow-lg">
                            <img src={socialImage} alt="Social" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-[#0b1120]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                              <button type="button" onClick={() => setSocialImage("")} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-xl">Remove</button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full aspect-video bg-[#0b1120] border border-slate-800 border-dashed rounded-xl flex flex-col items-center justify-center hover:bg-slate-900/50 transition-colors cursor-pointer group">
                            <ImageIcon className="w-8 h-8 text-slate-600 mb-2 group-hover:text-slate-500 transition-colors" />
                            <p className="text-slate-500 font-medium text-sm group-hover:text-slate-400 transition-colors">Upload Social Image</p>
                            <div className="absolute inset-0 opacity-0 cursor-pointer">
                              <UploadDropzone endpoint="imageUploader" onClientUploadComplete={(res) => { if (res && res[0]) setSocialImage(res[0].url); }} onUploadError={(err) => setError("Image upload failed.")} appearance={{ button: "w-full h-full cursor-pointer", allowedContent: "hidden", container: "p-0 border-none", label: "hidden" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ================= BLOCK TAB (THE ELEMENTOR/GUTENBERG UPGRADE) ================= */}
              {masterTab === 'block' && (
                <div className="animate-in fade-in duration-200">
                  
                  {activeNode.type === 'image' && (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      
                      {/* Image Settings Accordion */}
                      <div>
                        <button onClick={() => toggleAccordion('image-settings')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0d1424] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Settings</span>
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openAccordions.includes('image-settings') ? 'rotate-90' : ''}`}/>
                        </button>
                        {openAccordions.includes('image-settings') && (
                          <div className="p-4 pt-0 space-y-4 bg-white dark:bg-[#0d1424]">
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Alternative Text</label>
                              <textarea 
                                rows={3} 
                                value={activeNode.attrs?.alt || ''}
                                placeholder="Describe the purpose of the image..." 
                                onChange={(e) => updateActiveNode({ alt: e.target.value })} 
                                className="w-full bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-sm rounded p-2 focus:border-[#0073aa] focus:outline-none resize-none">
                              </textarea>
                              <p className="text-[10px] text-slate-500 mt-1">Leave empty if decorative.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Width (px/%/auto)</label>
                                <input type="text" value={activeNode.attrs?.width || ''} onChange={(e) => updateActiveNode({ width: e.target.value })} placeholder="Auto" className="w-full bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-sm rounded p-2 focus:border-[#0073aa] focus:outline-none" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Height (px/%/auto)</label>
                                <input type="text" value={activeNode.attrs?.height || ''} onChange={(e) => updateActiveNode({ height: e.target.value })} placeholder="Auto" className="w-full bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 text-sm rounded p-2 focus:border-[#0073aa] focus:outline-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Image Styles Accordion */}
                      <div>
                        <button onClick={() => toggleAccordion('image-styles')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0d1424] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Styles</span>
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openAccordions.includes('image-styles') ? 'rotate-90' : ''}`}/>
                        </button>
                        {openAccordions.includes('image-styles') && (
                          <div className="p-4 pt-0 space-y-4 bg-white dark:bg-[#0d1424]">
                            <button onClick={() => updateActiveNode({ style: 'border-radius: 0px;' })} className="w-full flex items-center justify-between py-2 px-3 border border-slate-200 dark:border-slate-700 rounded text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Default {(!activeNode.attrs?.style || activeNode.attrs.style.includes('0px')) && <Check className="w-4 h-4 text-emerald-500"/>}
                            </button>
                            <button onClick={() => updateActiveNode({ style: 'border-radius: 20px;' })} className="w-full flex items-center justify-between py-2 px-3 border border-slate-200 dark:border-slate-700 rounded text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Rounded {(activeNode.attrs?.style && activeNode.attrs.style.includes('20px')) && <Check className="w-4 h-4 text-emerald-500"/>}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Image Duotone Accordion */}
                      <div>
                        <button onClick={() => toggleAccordion('image-duotone')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0d1424] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Duotone Engine</span>
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openAccordions.includes('image-duotone') ? 'rotate-90' : ''}`}/>
                        </button>
                        {openAccordions.includes('image-duotone') && (
                          <div className="p-4 pt-0 bg-white dark:bg-[#0d1424]">
                            <p className="text-xs text-slate-500 mb-3">Apply real-time CSS filters.</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              <button onClick={() => updateActiveNode({ style: 'filter: grayscale(100%) sepia(100%) hue-rotate(180deg) saturate(300%) contrast(100%);' })} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-blue-500 hover:scale-110 transition"></button>
                              <button onClick={() => updateActiveNode({ style: 'filter: grayscale(100%) sepia(100%) hue-rotate(90deg) saturate(300%) contrast(100%);' })} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-emerald-500 hover:scale-110 transition"></button>
                              <button onClick={() => updateActiveNode({ style: 'filter: grayscale(100%) sepia(100%) hue-rotate(320deg) saturate(300%) contrast(100%);' })} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-rose-500 hover:scale-110 transition"></button>
                              <button onClick={() => updateActiveNode({ style: 'filter: grayscale(100%) sepia(100%) hue-rotate(45deg) saturate(300%) contrast(100%);' })} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm bg-amber-500 hover:scale-110 transition"></button>
                              <button onClick={() => updateActiveNode({ style: 'filter: grayscale(100%);' })} className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 shadow-sm bg-slate-300 hover:scale-110 transition"></button>
                            </div>
                            <button onClick={() => updateActiveNode({ style: 'filter: none;' })} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded">Clear</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(activeNode.type === 'heading' || activeNode.type === 'paragraph') && (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      
                      {/* Color Accordion */}
                      <div>
                        <button onClick={() => toggleAccordion('color')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0d1424] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Color</span>
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openAccordions.includes('color') ? 'rotate-90' : ''}`}/>
                        </button>
                        {openAccordions.includes('color') && (
                          <div className="p-4 pt-0 space-y-3 bg-white dark:bg-[#0d1424]">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Text Color</p>
                            <div className="pt-1 flex flex-wrap gap-2 mb-4">
                              <button onClick={() => { editorInstance?.chain().focus().setColor('#10b981').run(); }} className="w-6 h-6 rounded-full bg-[#10b981] border-2 border-transparent hover:scale-110 transition"></button>
                              <button onClick={() => { editorInstance?.chain().focus().setColor('#3b82f6').run(); }} className="w-6 h-6 rounded-full bg-[#3b82f6] border-2 border-transparent hover:scale-110 transition"></button>
                              <button onClick={() => { editorInstance?.chain().focus().setColor('#ef4444').run(); }} className="w-6 h-6 rounded-full bg-[#ef4444] border-2 border-transparent hover:scale-110 transition"></button>
                              <button onClick={() => { editorInstance?.chain().focus().setColor('#eab308').run(); }} className="w-6 h-6 rounded-full bg-[#eab308] border-2 border-transparent hover:scale-110 transition"></button>
                              <button onClick={() => { editorInstance?.chain().focus().unsetColor().run(); }} className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 hover:scale-110 transition flex items-center justify-center text-[10px]">X</button>
                            </div>

                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Background Highlight</p>
                            <div className="pt-1 flex flex-wrap gap-2">
                              <button onClick={() => { editorInstance?.chain().focus().setHighlight({ color: '#dcfce7' }).run(); }} className="w-6 h-6 rounded-full bg-[#dcfce7] border-2 border-transparent hover:scale-110 transition"></button>
                              <button onClick={() => { editorInstance?.chain().focus().setHighlight({ color: '#dbeafe' }).run(); }} className="w-6 h-6 rounded-full bg-[#dbeafe] border-2 border-transparent hover:scale-110 transition"></button>
                              <button onClick={() => { editorInstance?.chain().focus().setHighlight({ color: '#fef08a' }).run(); }} className="w-6 h-6 rounded-full bg-[#fef08a] border-2 border-transparent hover:scale-110 transition"></button>
                              <button onClick={() => { editorInstance?.chain().focus().unsetHighlight().run(); }} className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 hover:scale-110 transition flex items-center justify-center text-[10px]">X</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Typography Accordion */}
                      <div>
                        <button onClick={() => toggleAccordion('typography')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0d1424] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Typography</span>
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openAccordions.includes('typography') ? 'rotate-90' : ''}`}/>
                        </button>
                        {openAccordions.includes('typography') && (
                          <div className="p-4 pt-0 bg-white dark:bg-[#0d1424]">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Font Size</label>
                            <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <button onClick={() => editorInstance?.commands.setFontSize('12px')} className="flex-1 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700">S</button>
                              <button onClick={() => editorInstance?.commands.setFontSize('16px')} className="flex-1 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700">M</button>
                              <button onClick={() => editorInstance?.commands.setFontSize('24px')} className="flex-1 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700">L</button>
                              <button onClick={() => editorInstance?.commands.setFontSize('32px')} className="flex-1 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">XL</button>
                            </div>
                            <button onClick={() => editorInstance?.commands.unsetFontSize()} className="text-[10px] text-[#0073aa] hover:underline mt-2">Clear Size</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Table Settings Accordion */}
                  {activeNode.type === 'table' && (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                      <div>
                        <button onClick={() => toggleAccordion('table-settings')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#0d1424] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Table Settings</span>
                          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openAccordions.includes('table-settings') ? 'rotate-90' : ''}`}/>
                        </button>
                        {openAccordions.includes('table-settings') && (
                          <div className="p-4 pt-0 space-y-4 bg-white dark:bg-[#0d1424]">
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => editorInstance?.chain().focus().addColumnAfter().run()} className="py-2 bg-slate-100 dark:bg-slate-800 text-sm font-medium rounded text-slate-700 dark:text-slate-300">Add Column</button>
                              <button onClick={() => editorInstance?.chain().focus().addRowAfter().run()} className="py-2 bg-slate-100 dark:bg-slate-800 text-sm font-medium rounded text-slate-700 dark:text-slate-300">Add Row</button>
                              <button onClick={() => editorInstance?.chain().focus().deleteTable().run()} className="col-span-2 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 text-sm font-medium rounded mt-4">Delete Table</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </aside>
        )}

      </div>
    </div>
  );
}