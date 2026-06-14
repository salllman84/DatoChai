"use client";

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Node, mergeAttributes } from '@tiptap/core';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { CodeBlock } from '@tiptap/extension-code-block';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Youtube } from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Extension } from '@tiptap/core';

import { 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Maximize, Minimize, Minus, 
  Bold, Italic, Link as LinkIcon, Heading1, Heading2, Heading3, ChevronDown, Image as ImageIcon,
  MoreVertical, Crop, Strikethrough
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { UploadButton } from "@/lib/uploadthing";

// Custom Font Size Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
          renderHTML: attributes => { if (!attributes.fontSize) return {}; return { style: `font-size: ${attributes.fontSize}` }; }
        }
      }
    }];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
    };
  }
});

const CustomVideo = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  addAttributes() { return { src: { default: null }, controls: { default: true } }; },
  parseHTML() { return [{ tag: 'video' }]; },
  renderHTML({ HTMLAttributes }) { return ['video', mergeAttributes(HTMLAttributes, { class: 'w-full rounded-xl shadow-lg border border-slate-800 my-6' })]; },
});

const SmartImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: 'align-center rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 my-6 max-w-full transition-all duration-300',
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => { return { class: attributes.class }; },
      },
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => { return { style: attributes.style }; }
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => { return { width: attributes.width }; }
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => { return { height: attributes.height }; }
      }
    };
  },
});

export default function RichTextEditor({ 
  content, 
  onChange, 
  onEditorReady,
  onContextUpdate,
  previewMode = 'desktop'
}: { 
  content: string; 
  onChange: (content: string) => void;
  onEditorReady: (editor: Editor) => void;
  onContextUpdate?: (context: { type: string, attrs: any }) => void;
  previewMode?: 'desktop' | 'tablet' | 'mobile';
}) {
  
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      SmartImage.configure({ inline: true }),
      // FIXED: openOnClick is set to true so links work inside the editor
      Link.configure({ openOnClick: true, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', class: 'text-[#0073aa] underline hover:text-blue-600 cursor-pointer' } }),
      CodeBlock.configure({ HTMLAttributes: { class: 'bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-sm border border-slate-800 my-4 overflow-x-auto relative' } }),
      Youtube.configure({ HTMLAttributes: { class: 'w-full aspect-video rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 my-6' } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'w-full border-collapse border border-slate-300 dark:border-slate-700 my-6' } }),
      TableRow.configure({ HTMLAttributes: { class: 'border-b border-slate-300 dark:border-slate-700' } }),
      TableHeader.configure({ HTMLAttributes: { class: 'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 text-left font-bold text-slate-700 dark:text-slate-200 min-w-[120px]' } }),
      TableCell.configure({ HTMLAttributes: { class: 'border border-slate-300 dark:border-slate-700 p-3 text-slate-600 dark:text-slate-300 relative min-w-[120px]' } }),
      CustomVideo,
    ],
    content: content,
    editorProps: {
      attributes: { class: 'prose prose-slate dark:prose-invert max-w-none w-full p-6 focus:outline-none min-h-[600px] [&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-[3px] [&_.ProseMirror-selectednode]:outline-[#0073aa] [&_.ProseMirror-selectednode]:outline-offset-2 [&_.ProseMirror-selectednode]:rounded-xl' },
    },
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
    onTransaction: ({ editor }) => {
      if (onContextUpdate) {
        let type = 'paragraph';
        let attrs = {};
        if (editor.isActive('image')) { type = 'image'; attrs = editor.getAttributes('image'); }
        else if (editor.isActive('table')) { type = 'table'; attrs = editor.getAttributes('table'); }
        else if (editor.isActive('heading')) { type = 'heading'; attrs = { ...editor.getAttributes('heading'), ...editor.getAttributes('textStyle') }; }
        else { type = 'paragraph'; attrs = editor.getAttributes('textStyle'); }
        onContextUpdate({ type, attrs });
      }
    }
  });

  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  if (!editor) return null;

  const maxWidthClass = previewMode === 'mobile' ? 'max-w-[400px] border-x border-slate-200 dark:border-slate-800 shadow-2xl mx-auto min-h-[800px]' : 
                        previewMode === 'tablet' ? 'max-w-[768px] border-x border-slate-200 dark:border-slate-800 shadow-2xl mx-auto min-h-[1024px]' : 
                        'max-w-[1000px] mx-auto';

  return (
    <div className={`w-full transition-all duration-500 ease-in-out ${maxWidthClass} relative`}>
      
      {editor.isActive('image') && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] flex items-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center p-1 border-r border-slate-200 dark:border-slate-700">
            <div className="relative flex items-center justify-center px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer overflow-hidden group">
              <ImageIcon className="w-4 h-4 text-slate-600 dark:text-slate-300 mr-2" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Replace</span>
              <div className="absolute inset-0 opacity-0 cursor-pointer">
                <UploadButton endpoint="imageUploader" onClientUploadComplete={(res) => { if (res && res[0]) editor.chain().focus().setImage({ src: res[0].url }).run(); }} onUploadError={() => alert('Failed')} />
              </div>
            </div>
          </div>
          <div className="flex items-center p-1 border-r border-slate-200 dark:border-slate-700">
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'align-left rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 my-6 max-w-[50%] mr-6' }).run()} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"><AlignLeft className="w-4 h-4"/></button>
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'align-center rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 my-6 max-w-full mx-auto' }).run()} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"><AlignCenter className="w-4 h-4"/></button>
            <button onClick={() => editor.chain().focus().updateAttributes('image', { class: 'align-right rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 my-6 max-w-[50%] ml-6' }).run()} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"><AlignRight className="w-4 h-4"/></button>
          </div>
          <div className="flex items-center p-1 border-r border-slate-200 dark:border-slate-700">
            <button onClick={() => editor.chain().focus().updateAttributes('image', { style: 'border-radius: 9999px; aspect-ratio: 1/1; object-fit: cover;' }).run()} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded" title="Crop Circle"><Crop className="w-4 h-4"/></button>
          </div>
          <div className="flex items-center p-1">
            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"><MoreVertical className="w-4 h-4"/></button>
          </div>
        </div>
      )}

      {editor.isEditable && !editor.isActive('image') && !editor.isActive('table') && !editor.state.selection.empty && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] flex items-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="relative flex items-center p-1 border-r border-slate-200 dark:border-slate-700">
            <button onClick={() => setHeadingMenuOpen(!headingMenuOpen)} className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded text-xs font-bold">
              {editor.isActive('heading', { level: 1 }) ? 'H1' : editor.isActive('heading', { level: 2 }) ? 'H2' : editor.isActive('heading', { level: 3 }) ? 'H3' : '¶'} <ChevronDown className="w-3 h-3"/>
            </button>
            {headingMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xl py-1 z-50 flex flex-col">
                <button onClick={() => { editor.chain().focus().setParagraph().run(); setHeadingMenuOpen(false); }} className="px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Paragraph</button>
                <button onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setHeadingMenuOpen(false); }} className="px-3 py-2 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Heading 1</button>
                <button onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setHeadingMenuOpen(false); }} className="px-3 py-2 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Heading 2</button>
                <button onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setHeadingMenuOpen(false); }} className="px-3 py-2 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Heading 3</button>
              </div>
            )}
          </div>
          <div className="flex items-center p-1 border-r border-slate-200 dark:border-slate-700">
            <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded ${editor.isActive({ textAlign: 'left' }) ? 'text-[#0073aa] bg-blue-50 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><AlignLeft className="w-4 h-4"/></button>
            <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded ${editor.isActive({ textAlign: 'center' }) ? 'text-[#0073aa] bg-blue-50 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><AlignCenter className="w-4 h-4"/></button>
          </div>
          <div className="flex items-center p-1 border-r border-slate-200 dark:border-slate-700">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded ${editor.isActive('bold') ? 'text-[#0073aa] bg-blue-50 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Bold className="w-4 h-4"/></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded ${editor.isActive('italic') ? 'text-[#0073aa] bg-blue-50 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Italic className="w-4 h-4"/></button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded ${editor.isActive('strike') ? 'text-[#0073aa] bg-blue-50 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Strikethrough className="w-4 h-4"/></button>
            <button onClick={() => {
              const previousUrl = editor.getAttributes('link').href;
              let url = window.prompt('Enter URL:', previousUrl);
              if (url === null) return;
              if (url === '') { editor.chain().focus().unsetLink().run(); return; }
              if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) url = 'https://' + url;
              editor.chain().focus().setLink({ href: url }).run();
            }} className={`p-1.5 rounded ${editor.isActive('link') ? 'text-[#0073aa] bg-blue-50 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><LinkIcon className="w-4 h-4"/></button>
          </div>
          <div className="flex items-center p-1">
            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded"><MoreVertical className="w-4 h-4"/></button>
          </div>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}