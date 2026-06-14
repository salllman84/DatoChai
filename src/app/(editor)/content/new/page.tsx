"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Sparkles, Save, AlertCircle, Loader2, 
  Settings, Briefcase, FileJson, Share2, TrendingUp, X 
} from "lucide-react";
import Link from "next/link";
import { createArticle } from "@/lib/actions/content";
import { UploadDropzone } from "@/lib/uploadthing";
import "@uploadthing/react/styles.css";
import RichTextEditor from "@/components/admin/editor/rich-text-editor";

export default function NewArticleEditor() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  
  // Real-time React States for Live Preview
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [featuredImage, setFeaturedImage] = useState(""); // NEW: Holds the uploaded image URL
  const [error, setError] = useState("");

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (title.length > 0 || content.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [title, content]);

  const handleSave = async (formData: FormData) => {
    setIsSaving(true);
    setError(""); 
    const result = await createArticle(formData);
    
    if (result?.error) {
      setError(result.error);
      setIsSaving(false);
    } else if (result?.success) {
      router.push("/content");
    }
  };

  // Generate dynamic text for the Google snippet preview
  const displaySeoTitle = seoTitle || title || "Your Awesome Article Title Here";
  const displaySlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || "auto-draft";

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/content" className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Draft New Article</h1>
            <p className="text-slate-400 text-sm">Content is automatically saved as a Draft.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{error}</p>
        </div>
      )}

      <form action={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* NEW: Hidden input to send the image URL to the database */}
        <input type="hidden" name="featuredImage" value={featuredImage} />

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <input 
              type="text" 
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title..."
              className="w-full bg-transparent text-3xl font-bold text-white placeholder-slate-600 focus:outline-none mb-6"
              required
            />

            {/* NEW: FEATURED IMAGE DROPZONE */}
            <div className="mb-6 border-b border-slate-800 pb-6">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Featured Image
              </label>
              
              {featuredImage ? (
                <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-700 group">
                  <img src={featuredImage} alt="Featured" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={() => setFeaturedImage("")}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <X className="w-4 h-4" /> Remove Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/50 border border-slate-800 border-dashed rounded-xl p-4">
                  <UploadDropzone
                    endpoint="imageUploader"
                    onClientUploadComplete={(res) => {
                      if (res && res[0]) {
                        setFeaturedImage(res[0].url);
                      }
                    }}
                    onUploadError={(error: Error) => {
                      setError(`Upload failed: ${error.message}`);
                    }}
                    appearance={{
                      button: "bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 mt-4",
                      label: "text-emerald-400 hover:text-emerald-300",
                      container: "border-none p-4",
                      allowedContent: "text-slate-500"
                    }}
                  />
                </div>
              )}
            </div>

            <input type="hidden" name="content" value={content} />
            <RichTextEditor content={content} onChange={setContent} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            
            <div className="flex border-b border-slate-800 bg-slate-950/50">
              <button type="button" onClick={() => setActiveTab("general")} className={`flex-1 p-3 flex justify-center border-b-2 transition-colors ${activeTab === "general" ? "border-emerald-500 text-emerald-400 bg-slate-900/50" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                <Settings className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setActiveTab("advanced")} className={`flex-1 p-3 flex justify-center border-b-2 transition-colors ${activeTab === "advanced" ? "border-emerald-500 text-emerald-400 bg-slate-900/50" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                <Briefcase className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setActiveTab("schema")} className={`flex-1 p-3 flex justify-center border-b-2 transition-colors ${activeTab === "schema" ? "border-emerald-500 text-emerald-400 bg-slate-900/50" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                <FileJson className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setActiveTab("social")} className={`flex-1 p-3 flex justify-center border-b-2 transition-colors ${activeTab === "social" ? "border-emerald-500 text-emerald-400 bg-slate-900/50" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              
              {activeTab === "general" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">Google Snippet Preview</p>
                    <p className="text-sm text-slate-400 truncate">https://datochai.com/{displaySlug}</p>
                    <p className="text-lg text-blue-500 font-medium truncate mt-1 hover:underline cursor-pointer">{displaySeoTitle}</p>
                    <p className="text-sm text-slate-300 mt-1 line-clamp-2">{seoDesc || "Please provide an SEO meta description."}</p>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                      Focus Keyword <TrendingUp className="w-3 h-3 text-emerald-500" />
                    </label>
                    <input type="text" name="focusKeyword" placeholder="e.g. Grand Dragon Lotto" className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">SEO Title</label>
                    <input type="text" name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Custom Search Title" className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Meta Description</label>
                    <textarea name="seoDescription" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={3} placeholder="Write a compelling description to boost CTR..." className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2">URL Slug</label>
                    <input type="text" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated-from-title" className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>
                </div>
              )}

              {activeTab === "advanced" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">Robots Meta</p>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-400">
                    <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded bg-slate-950 border-slate-800 text-emerald-500" /> Index</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded bg-slate-950 border-slate-800 text-emerald-500" /> No Index</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded bg-slate-950 border-slate-800 text-emerald-500" /> Nofollow</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded bg-slate-950 border-slate-800 text-emerald-500" /> No Archive</label>
                  </div>
                </div>
              )}

              {activeTab === "schema" && (
                <div className="space-y-4 animate-in fade-in duration-200 text-center py-4">
                  <FileJson className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Configure Schema Markup to display rich results in SERPs.</p>
                  <div className="border border-slate-800 rounded-lg p-3 flex justify-between items-center bg-slate-950">
                    <span className="text-sm text-slate-300 flex items-center gap-2"><FileJson className="w-4 h-4 text-slate-500"/> Article</span>
                    <button type="button" className="text-emerald-500 hover:text-emerald-400 text-xs font-medium">Edit</button>
                  </div>
                </div>
              )}

              {activeTab === "social" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-sm text-slate-400">Edit the thumbnail, title, and description displayed when shared on Facebook or X (Twitter).</p>
                  <div className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-sm border-dashed">
                    Upload Social Image
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 mt-auto">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Saving to Database..." : "Save as Draft"}
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}