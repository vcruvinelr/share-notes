import Editor from '@monaco-editor/react';
import { Select, Space, Typography, theme } from 'antd';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';

const { Text } = Typography;

interface CodeEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

const CodeEditor = ({ content, onChange, readOnly = false }: CodeEditorProps) => {
  const [language, setLanguage] = useState('javascript');
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const { token } = theme.useToken();
  const { isDarkMode } = useAuth();

  // Auto-sync editor theme with app theme
  useEffect(() => {
    setEditorTheme(isDarkMode ? 'vs-dark' : 'light');
  }, [isDarkMode]);

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadius,
        overflow: 'hidden',
      }}
    >
      {/* Editor Controls */}
      {!readOnly && (
        <div
          style={{
            padding: '8px 12px',
            borderBottom: `1px solid ${token.colorBorder}`,
            backgroundColor: token.colorBgContainer,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Text strong>Language:</Text>
            <Select
              value={language}
              onChange={setLanguage}
              style={{ width: 150 }}
              size="small"
              options={[
                { label: 'JavaScript', value: 'javascript' },
                { label: 'TypeScript', value: 'typescript' },
                { label: 'Python', value: 'python' },
                { label: 'Java', value: 'java' },
                { label: 'C/C++', value: 'cpp' },
                { label: 'C#', value: 'csharp' },
                { label: 'Go', value: 'go' },
                { label: 'Rust', value: 'rust' },
                { label: 'HTML', value: 'html' },
                { label: 'CSS', value: 'css' },
                { label: 'JSON', value: 'json' },
                { label: 'XML', value: 'xml' },
                { label: 'Markdown', value: 'markdown' },
                { label: 'SQL', value: 'sql' },
                { label: 'Shell', value: 'shell' },
                { label: 'YAML', value: 'yaml' },
                { label: 'Plain Text', value: 'plaintext' },
              ]}
            />
          </Space>

          <Space>
            <Text strong>Theme:</Text>
            <Select
              value={editorTheme}
              onChange={setEditorTheme}
              style={{ width: 120 }}
              size="small"
              options={[
                { label: 'Dark', value: 'vs-dark' },
                { label: 'Light', value: 'light' },
              ]}
            />
          </Space>
        </div>
      )}

      {/* Monaco Editor */}
      <Editor
        height="500px"
        language={language}
        theme={editorTheme}
        value={content}
        onChange={(value) => onChange(value || '')}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          quickSuggestions: !readOnly,
        }}
      />
    </div>
  );
};

export default CodeEditor;
