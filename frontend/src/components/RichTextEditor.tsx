import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button, Space, Divider, theme } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CodeOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

const RichTextEditor = ({ content, onChange, readOnly = false }: RichTextEditorProps) => {
  const { token } = theme.useToken();
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start typing your note...',
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  if (readOnly) {
    return (
      <div 
        className="tiptap-editor readonly"
        style={{
          padding: '12px',
          minHeight: '400px',
          border: `1px solid ${token.colorBorder}`,
          borderRadius: '6px',
          backgroundColor: token.colorBgContainer,
          color: token.colorText,
        }}
      >
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div style={{ 
      border: `1px solid ${token.colorBorder}`, 
      borderRadius: '6px',
      backgroundColor: token.colorBgContainer,
    }}>
      {/* Toolbar */}
      <div style={{ 
        padding: '8px', 
        borderBottom: `1px solid ${token.colorBorder}`,
        backgroundColor: token.colorBgLayout,
      }}>
        <Space split={<Divider type="vertical" />}>
          <Space size="small">
            <Button
              size="small"
              icon={<BoldOutlined />}
              onClick={() => editor.chain().focus().toggleBold().run()}
              type={editor.isActive('bold') ? 'primary' : 'default'}
            />
            <Button
              size="small"
              icon={<ItalicOutlined />}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              type={editor.isActive('italic') ? 'primary' : 'default'}
            />
            <Button
              size="small"
              icon={<StrikethroughOutlined />}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              type={editor.isActive('strike') ? 'primary' : 'default'}
            />
            <Button
              size="small"
              icon={<CodeOutlined />}
              onClick={() => editor.chain().focus().toggleCode().run()}
              type={editor.isActive('code') ? 'primary' : 'default'}
            />
          </Space>
          
          <Space size="small">
            <Button
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              type={editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'}
            >
              H1
            </Button>
            <Button
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'}
            >
              H2
            </Button>
            <Button
              size="small"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              type={editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'}
            >
              H3
            </Button>
          </Space>

          <Space size="small">
            <Button
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              type={editor.isActive('bulletList') ? 'primary' : 'default'}
            />
            <Button
              size="small"
              icon={<OrderedListOutlined />}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              type={editor.isActive('orderedList') ? 'primary' : 'default'}
            />
          </Space>

          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            type={editor.isActive('link') ? 'primary' : 'default'}
          />
        </Space>
      </div>

      {/* Editor Content */}
      <div 
        className="tiptap-editor"
        style={{
          padding: '12px',
          minHeight: '400px',
          backgroundColor: token.colorBgContainer,
          color: token.colorText,
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .tiptap-editor .ProseMirror {
          outline: none;
          min-height: 376px;
          color: ${token.colorText};
        }

        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: ${token.colorTextPlaceholder};
          pointer-events: none;
          height: 0;
          float: left;
        }

        .tiptap-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.5em 0;
          color: ${token.colorText};
        }

        .tiptap-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.5em 0;
          color: ${token.colorText};
        }

        .tiptap-editor h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 0.5em 0;
          color: ${token.colorText};
        }

        .tiptap-editor ul,
        .tiptap-editor ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }

        .tiptap-editor code {
          background-color: ${token.colorBgTextHover};
          color: ${token.colorText};
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }

        .tiptap-editor a {
          color: ${token.colorLink};
          text-decoration: underline;
        }

        .tiptap-editor strong {
          font-weight: bold;
        }

        .tiptap-editor em {
          font-style: italic;
        }

        .tiptap-editor s {
          text-decoration: line-through;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
