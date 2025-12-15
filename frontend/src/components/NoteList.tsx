import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  List,
  Button,
  Input,
  Space,
  Typography,
  Empty,
  Spin,
  Tag,
  Popconfirm,
  Alert,
  message,
  Progress,
  Segmented,
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  GlobalOutlined,
  CrownOutlined,
  CodeOutlined,
  EditOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { noteService } from '../services/noteService';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import PricingModal from './PricingModal';
import config from '../config';
import type { Note } from '../types';

const { Title, Text } = Typography;

const NoteList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [noteType, setNoteType] = useState<'standard' | 'code'>('standard');
  const [creating, setCreating] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [noteLimit, setNoteLimit] = useState<any>(null);
  
  // Get consistent anonymous user ID from localStorage (set by AuthContext)
  const getAnonymousUserId = () => {
    if (user?.id) return null; // Authenticated user, no anonymous ID
    return localStorage.getItem('anonymousUserId');
  };
  
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(getAnonymousUserId());

  useEffect(() => {
    // Always reload notes and limits when component mounts or location changes
    loadNotes();
    loadNoteLimit();
    
    // Update anonymous user ID based on auth state
    if (!user) {
      const anonId = getAnonymousUserId();
      setAnonymousUserId(anonId);
      
      // Verify anonymous user exists in backend
      noteService.getCurrentUser().catch(error => {
        console.error('Error verifying anonymous user:', error);
      });
    } else {
      // Clear anonymous ID when authenticated
      setAnonymousUserId(null);
    }
  }, [user, location.key]); // Reload when location.key changes (navigation)

  const loadNotes = async () => {
    try {
      const data = await noteService.getNotes();
      setNotes(data);
    } catch (error) {
      console.error('Error loading notes:', error);
      message.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const loadNoteLimit = async () => {
    try {
      const data = await subscriptionService.getNoteLimit();
      setNoteLimit(data);
    } catch (error) {
      console.error('Error loading note limit:', error);
    }
  };

  const createNote = async () => {
    if (!newNoteTitle.trim()) {
      message.error('Please enter a note title');
      return;
    }

    // Check note limit only if subscriptions are enabled
    if (config.features.enableSubscriptions && noteLimit && !noteLimit.can_create_more) {
      setPricingModalOpen(true);
      return;
    }

    setCreating(true);
    try {
      const note = await noteService.createNote({
        title: newNoteTitle,
        content: '',
        note_type: noteType,
        is_public: false,
      });

      message.success('Note created successfully');
      setNewNoteTitle('');
      setNoteType('standard'); // Reset to default
      navigate(`/notes/${note.id}`);
      if (config.features.enableSubscriptions) {
        loadNoteLimit(); // Refresh limit only if subscriptions are enabled
      }
    } catch (error: any) {
      console.error('Error creating note:', error);
      if (config.features.enableSubscriptions && error.response?.status === 403) {
        setPricingModalOpen(true);
      } else {
        message.error('Failed to create note');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { checkout_url } = await subscriptionService.createCheckoutSession();
      window.location.href = checkout_url;
    } catch (error: any) {
      console.error('Upgrade error:', error);
      if (error.response?.status === 403) {
        message.error('Please sign in to upgrade to premium');
      } else {
        message.error('Failed to start upgrade process');
      }
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await noteService.deleteNote(noteId);
      message.success('Note deleted successfully');
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      message.error('Failed to delete note');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Spin size="large" tip="Loading notes...">
          <div style={{ padding: '50px' }} />
        </Spin>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
      }}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>My Notes</Title>

          {/* Note Limit Banner for Free Users */}
          {config.features.enableSubscriptions && noteLimit && !noteLimit.is_premium && (
            <Alert
              message={
                <Space>
                  <span>
                    Free Plan: {noteLimit.note_count}/{noteLimit.limit} notes used
                  </span>
                  {!noteLimit.can_create_more && <Tag color="warning">Limit Reached</Tag>}
                </Space>
              }
              description={
                <Space orientation="vertical" size="small">
                  <div>
                    <Progress
                      percent={Math.round((noteLimit.note_count / noteLimit.limit) * 100)}
                      status={noteLimit.can_create_more ? 'active' : 'exception'}
                      showInfo={false}
                    />
                  </div>
                  <div>
                    {noteLimit.can_create_more ? (
                      <Text>Upgrade to Premium for unlimited notes and premium features!</Text>
                    ) : (
                      <Text type="danger">
                        You've reached the free plan limit. Upgrade to create more notes.
                      </Text>
                    )}
                  </div>
                  <Button
                    type="primary"
                    icon={<CrownOutlined />}
                    onClick={() => setPricingModalOpen(true)}
                    size="small"
                  >
                    Upgrade to Premium - Only $3/month
                  </Button>
                </Space>
              }
              type={noteLimit.can_create_more ? 'info' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {config.features.enableAuth && !user && (
            <Alert
              message="Anonymous Mode"
              description="You're using notes in anonymous mode. Your notes are stored temporarily and will be lost after your session expires. Sign in to save notes permanently."
              type="info"
              icon={<FileTextOutlined />}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Note Type Selector */}
          <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
            <Text strong>Note Type:</Text>
            <Segmented
              value={noteType}
              onChange={(value) => setNoteType(value as 'standard' | 'code')}
              options={[
                {
                  label: (
                    <div style={{ padding: 4 }}>
                      <EditOutlined /> Standard
                    </div>
                  ),
                  value: 'standard',
                },
                {
                  label: (
                    <div style={{ padding: 4 }}>
                      <CodeOutlined /> Code
                    </div>
                  ),
                  value: 'code',
                },
              ]}
              block
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {noteType === 'standard'
                ? 'Rich text editor with formatting options (bold, italic, lists, etc.)'
                : 'VS Code-powered editor with syntax highlighting for programming'}
            </Text>
          </Space>

          <Space.Compact style={{ width: '100%' }}>
            <Input
              size="large"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Enter note title..."
              onPressEnter={createNote}
            />
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={createNote}
              loading={creating}
            >
              Create Note
            </Button>
          </Space.Compact>
        </div>

        {notes.length === 0 ? (
          <Card>
            <Empty
              image={<FileTextOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />}
              imageStyle={{ height: 80 }}
              description={
                <Text type="secondary" style={{ fontSize: 16 }}>
                  No notes yet. Create your first note!
                </Text>
              }
            />
          </Card>
        ) : (
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 2,
              lg: 3,
              xl: 3,
              xxl: 4,
            }}
            dataSource={notes}
            renderItem={(note) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => navigate(`/notes/${note.id}`)}
                  style={{ position: 'relative' }}
                >
                  {note.owner_id === (user?.id || anonymousUserId) && (
                    <Popconfirm
                      title="Delete note"
                      description="Are you sure you want to delete this note?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        deleteNote(note.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="Yes"
                      cancelText="No"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<CloseCircleOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                      />
                    </Popconfirm>
                  )}
                  <Card.Meta
                    title={
                      <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                        <Text strong ellipsis={{ tooltip: note.title }}>
                          {note.title}
                        </Text>
                        {note.is_public && (
                          <Tag icon={<GlobalOutlined />} color="success">
                            Public
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(note.updated_at).toLocaleDateString()} at{' '}
                        {new Date(note.updated_at).toLocaleTimeString()}
                      </Text>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Space>

      {config.features.enableSubscriptions && (
        <PricingModal
          open={pricingModalOpen}
          onClose={() => setPricingModalOpen(false)}
          onUpgrade={handleUpgrade}
        />
      )}
    </div>
  );
};

export default NoteList;
