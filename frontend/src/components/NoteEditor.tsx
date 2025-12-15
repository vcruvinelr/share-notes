import { useState, useEffect, useRef, ChangeEvent, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Space,
  Badge,
  Tag,
  Spin,
  Modal,
  Form,
  Select,
  App,
  Alert,
  theme,
  Popconfirm,
} from 'antd';
import {
  SaveOutlined,
  ShareAltOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  EditOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  CodeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { noteService } from '../services/noteService';
import websocket from '../services/websocket';
import { useAuth } from '../contexts/useAuth';
import config from '../config';
import PricingModal from './PricingModal';
import RichTextEditor from './RichTextEditor';
import CodeEditor from './CodeEditor';
import type {
  Note,
  WebSocketMessage,
  ContentMessage,
  CursorMessage,
  UserJoinedMessage,
  UserLeftMessage,
  UserListMessage,
  ErrorMessage,
  EditMessage,
} from '../types';

const NoteEditor = () => {
  const { noteId, shareToken } = useParams<{ noteId?: string; shareToken?: string }>();
  const navigate = useNavigate();
  const { user, getToken, loading: authLoading } = useAuth();
  const { token } = theme.useToken();
  const { message, notification } = App.useApp();

  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Array<{ user_id: string; username: string }>>([]);
  const [hasWritePermission, setHasWritePermission] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const lastContentRef = useRef('');

  // Get consistent user ID - authenticated takes precedence, anonymous ID set by AuthContext
  const getUserId = useCallback(() => {
    if (user?.id) return user.id;
    return localStorage.getItem('anonymousUserId') || '';
  }, [user?.id]);

  const userIdRef = useRef(getUserId());
  const usernameRef = useRef(user?.username || 'Anonymous');

  // Update userIdRef when user changes (login/logout)
  useEffect(() => {
    userIdRef.current = getUserId();
    usernameRef.current = user?.username || 'Anonymous';
  }, [user, getUserId]);

  const applyRemoteEdit = useCallback((editData: EditMessage) => {
    console.log('[NoteEditor] Applying remote edit:', editData);
    const { operation, position, content: editContent, length } = editData;

    setContent((prevContent) => {
      let newContent = prevContent;

      switch (operation) {
        case 'insert':
          newContent =
            prevContent.slice(0, position) + (editContent || '') + prevContent.slice(position);
          break;
        case 'delete':
          newContent = prevContent.slice(0, position) + prevContent.slice(position + (length || 0));
          break;
        case 'replace':
          newContent =
            prevContent.slice(0, position) +
            (editContent || '') +
            prevContent.slice(position + (length || 0));
          break;
        default:
          break;
      }

      lastContentRef.current = newContent;
      return newContent;
    });
  }, []);

  useEffect(() => {
    const handleConnected = () => {
      console.log('Connected to collaborative session');
      notification.success({
        title: 'Connected',
        description: 'You joined the collaborative session',
        icon: <TeamOutlined style={{ color: '#52c41a' }} />,
        placement: 'topRight',
        duration: 2,
      });
    };

    const handleContent = (data: WebSocketMessage) => {
      const contentData = data as ContentMessage;
      setContent(contentData.content);
      lastContentRef.current = contentData.content;
    };

    const handleEdit = (data: WebSocketMessage) => {
      // Only apply remote edits for premium users (real-time collaboration)
      if (isPremium) {
        applyRemoteEdit(data as EditMessage);
      }
    };

    const handleCursor = (data: WebSocketMessage) => {
      const cursorData = data as CursorMessage;
      console.log('Cursor update:', cursorData);
    };

    const handleUserJoined = (data: WebSocketMessage) => {
      const userData = data as UserJoinedMessage;
      notification.success({
        title: 'User Joined',
        description: `${userData.username} joined the session`,
        icon: <UserAddOutlined style={{ color: '#52c41a' }} />,
        placement: 'topRight',
        duration: 3,
      });
      setActiveUsers((prev) => [
        ...prev,
        { user_id: userData.user_id, username: userData.username },
      ]);
    };

    const handleUserLeft = (data: WebSocketMessage) => {
      const userData = data as UserLeftMessage;
      notification.info({
        title: 'User Left',
        description: `${userData.username} left the session`,
        icon: <UserDeleteOutlined style={{ color: '#1890ff' }} />,
        placement: 'topRight',
        duration: 3,
      });
      setActiveUsers((prev) => prev.filter((u) => u.user_id !== userData.user_id));
    };

    const handleUserList = (data: WebSocketMessage) => {
      const listData = data as UserListMessage;
      setActiveUsers(listData.users);

      if (listData.users.length > 0) {
        const otherUsers = listData.users.filter((u) => u.user_id !== userIdRef.current);
        if (otherUsers.length > 0) {
          notification.info({
            title: 'Active Users',
            description: `${otherUsers.length} ${otherUsers.length === 1 ? 'user is' : 'users are'} already in this session`,
            icon: <TeamOutlined style={{ color: '#1890ff' }} />,
            placement: 'topRight',
            duration: 2,
          });
        }
      }
    };

    const handleError = (data: WebSocketMessage) => {
      const errorData = data as ErrorMessage;
      const errorMsg = errorData.message || 'WebSocket error';

      // Check if error is related to premium features
      if (errorMsg.includes('premium') || errorMsg.includes('subscription')) {
        Modal.warning({
          title: 'Premium Feature',
          content: errorMsg,
          okText: 'Upgrade to Premium',
          onOk: () => {
            setShowPricingModal(true);
          },
        });
      } else {
        message.error(errorMsg);
      }
    };

    websocket.on('connected', handleConnected);
    websocket.on('content', handleContent);
    websocket.on('edit', handleEdit);
    websocket.on('cursor', handleCursor);
    websocket.on('user_joined', handleUserJoined);
    websocket.on('user_left', handleUserLeft);
    websocket.on('user_list', handleUserList);
    websocket.on('error', handleError);

    return () => {
      websocket.off('connected', handleConnected);
      websocket.off('content', handleContent);
      websocket.off('edit', handleEdit);
      websocket.off('cursor', handleCursor);
      websocket.off('user_joined', handleUserJoined);
      websocket.off('user_left', handleUserLeft);
      websocket.off('user_list', handleUserList);
      websocket.off('error', handleError);
    };
  }, [applyRemoteEdit, isPremium, message, notification]);

  useEffect(() => {
    // Wait for auth to complete before initializing
    if (authLoading) {
      console.log('[NoteEditor] Waiting for auth to complete...');
      return;
    }

    const initializeNote = async () => {
      console.log('[NoteEditor] initializeNote - user:', user?.id, 'authenticated:', !!user);

      if (!user) {
        try {
          const response = await noteService.getCurrentUser();
          userIdRef.current = response.id;
          usernameRef.current = response.username || 'Anonymous';
          console.log('[NoteEditor] Anonymous user initialized:', response);
        } catch (error) {
          console.error('[NoteEditor] Error getting current user:', error);
        }
      }

      if (noteId || shareToken) {
        await loadNote();
      } else {
        // No noteId yet - just finish loading
        setLoading(false);
      }
    };

    initializeNote();

    return () => {
      websocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, shareToken, user, authLoading]);

  const loadNote = async () => {
    if (!noteId && !shareToken) return;

    try {
      const data = shareToken
        ? await noteService.getSharedNote(shareToken)
        : await noteService.getNote(noteId!);
      setNote(data);
      setTitle(data.title);
      setContent(data.content);
      lastContentRef.current = data.content;

      // Update user refs - this is critical for WebSocket connection
      if (user && user.id) {
        userIdRef.current = user.id;
        usernameRef.current = user.username || 'User';
        console.log('[NoteEditor] Set authenticated user refs:', {
          userId: userIdRef.current,
          username: usernameRef.current,
        });
      } else {
        // For anonymous users, ensure we have the ID from localStorage
        const anonId = localStorage.getItem('anonymousUserId');
        if (anonId) {
          userIdRef.current = anonId;
          usernameRef.current = 'Anonymous';
          console.log('[NoteEditor] Set anonymous user refs:', {
            userId: userIdRef.current,
            username: usernameRef.current,
          });
        }
      }

      console.log(
        '[NoteEditor] Permission check - user:',
        user,
        'user.id:',
        user?.id,
        'userIdRef:',
        userIdRef.current,
        'data.owner_id:',
        data.owner_id,
        'data.share_permission_level:',
        data.share_permission_level
      );

      // Determine write permissions
      let canWrite = false;

      if (user && user.id) {
        // Authenticated user - compare both as strings to ensure match
        const userId = String(user.id);
        const ownerId = String(data.owner_id);

        console.log('[NoteEditor] Comparing owner:', {
          userId,
          ownerId,
          match: userId === ownerId,
        });

        canWrite =
          userId === ownerId ||
          data.permissions?.some(
            (p) => String(p.user_id) === userId && ['write', 'admin'].includes(p.permission_level)
          ) ||
          false;
        console.log('[NoteEditor] Registered user - canWrite:', canWrite);
      } else {
        // Anonymous user - use the userId from localStorage/ref
        const anonymousUserId = userIdRef.current;
        console.log(
          '[NoteEditor] Checking anonymous permissions - anonymousUserId:',
          anonymousUserId,
          'owner_id:',
          data.owner_id
        );

        if (data.owner_id === anonymousUserId) {
          canWrite = true;
          console.log('[NoteEditor] Anonymous user is owner - canWrite: true');
        } else if (data.share_permission_level) {
          canWrite = ['write', 'admin'].includes(data.share_permission_level);
          console.log(
            '[NoteEditor] Share permission level:',
            data.share_permission_level,
            'canWrite:',
            canWrite
          );
        } else {
          canWrite = false;
          console.log('[NoteEditor] No permission - canWrite: false');
        }
      }

      setHasWritePermission(canWrite);

      console.log(
        '[NoteEditor] Connecting to WebSocket for note:',
        data.id,
        'user:',
        userIdRef.current
      );

      // Check if user is premium for real-time collaboration
      setIsPremium(user?.is_premium || false);

      // Connect WebSocket after a small delay to ensure state is updated
      setTimeout(() => {
        connectWebSocket(data.id);
      }, 100);
    } catch (error) {
      console.error('Error loading note:', error);
      message.error('Failed to load note');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (actualNoteId?: string) => {
    const noteIdToUse = actualNoteId || note?.id || noteId;
    if (!noteIdToUse) {
      console.error('[NoteEditor] Cannot connect WebSocket: no note ID');
      return;
    }

    // Get the latest user ID - don't rely on ref which might be stale
    const currentUserId = user?.id || localStorage.getItem('anonymousUserId') || '';
    const currentUsername = user?.username || 'Anonymous';

    const token = getToken();
    console.log('[NoteEditor] WebSocket.connect:', {
      noteId: noteIdToUse,
      userId: currentUserId,
      username: currentUsername,
      hasUser: !!user,
    });
    websocket.connect(noteIdToUse, currentUserId, currentUsername, token);
  };

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement> | string) => {
    console.log('[NoteEditor] handleContentChange called');

    if (!hasWritePermission) {
      message.error('You do not have write permission');
      return;
    }

    const newContent = typeof e === 'string' ? e : e.target.value;
    const oldContent = lastContentRef.current;

    console.log('[NoteEditor] Content change:', { old: oldContent, new: newContent });

    // Update local state immediately
    setContent(newContent);
    lastContentRef.current = newContent;

    // Only send to WebSocket for premium users (real-time collaboration) and TextArea
    // Rich text and code editors handle their own change detection
    if (isPremium && typeof e !== 'string') {
      let operation: string;
      let position: number;
      let editContent: string | undefined;
      let length: number | undefined;

      if (newContent.length > oldContent.length) {
        operation = 'insert';
        const cursorPos = e.target.selectionStart;
        position = cursorPos - (newContent.length - oldContent.length);
        editContent = newContent.slice(position, cursorPos);
      } else if (newContent.length < oldContent.length) {
        operation = 'delete';
        position = e.target.selectionStart;
        length = oldContent.length - newContent.length;
      } else {
        operation = 'replace';
        const cursorPos = e.target.selectionStart;

        let diffPos = 0;
        while (diffPos < newContent.length && newContent[diffPos] === oldContent[diffPos]) {
          diffPos++;
        }

        position = diffPos;
        editContent = newContent.slice(diffPos, cursorPos);
        length = 1;
      }

      console.log('[NoteEditor] Sending edit to WebSocket:', {
        operation,
        position,
        editContent,
        length,
      });
      websocket.sendEdit(operation, position, editContent, length);
    } else {
      console.log('[NoteEditor] Non-premium user - edit will be saved on Save button click');
    }
  };

  const saveNote = async () => {
    if (!noteId) return;

    setSaving(true);
    try {
      await noteService.updateNote(noteId, { title, content });
      message.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      message.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (!noteId) return;

    try {
      await noteService.deleteNote(noteId);
      message.success('Note deleted successfully');
      navigate('/');
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
        <Spin size="large" tip="Loading note...">
          <div style={{ padding: '50px' }} />
        </Spin>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* Free User Notice */}
        {hasWritePermission && !isPremium && (
          <Alert
            message="Free Plan - Save to Update"
            description="You can edit this note, but changes will only be visible to others after you click the Save button. Upgrade to Premium for real-time collaboration where changes sync instantly!"
            type="info"
            showIcon
            action={
              <Button size="small" type="primary" onClick={() => setShowPricingModal(true)}>
                Upgrade
              </Button>
            }
            closable
          />
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: token.colorBgContainer,
            borderRadius: token.borderRadius,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
              Back
            </Button>

            <Input
              size="large"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Note"
              disabled={!hasWritePermission}
              variant="borderless"
              style={{
                fontSize: '20px',
                fontWeight: 500,
                width: '400px',
              }}
            />
          </Space>

          <Space size="middle">
            <Badge count={activeUsers.length + 1} showZero>
              <Tag icon={<TeamOutlined />} color="blue">
                Active Users
              </Tag>
            </Badge>

            <Tag
              icon={note?.note_type === 'code' ? <CodeOutlined /> : <EditOutlined />}
              color={note?.note_type === 'code' ? 'purple' : 'cyan'}
            >
              {note?.note_type === 'code' ? 'Code Editor' : 'Rich Text'}
            </Tag>

            <Tag
              icon={hasWritePermission ? <EditOutlined /> : <EyeOutlined />}
              color={hasWritePermission ? 'success' : 'default'}
            >
              {hasWritePermission ? 'Can Edit' : 'Read Only'}
            </Tag>

            {config.features.enableSubscriptions && hasWritePermission && isPremium && (
              <Tag color="gold" icon={<TeamOutlined />}>
                Real-time Sync
              </Tag>
            )}

            {hasWritePermission && (
              <Button type="primary" icon={<SaveOutlined />} onClick={saveNote} loading={saving}>
                Save
              </Button>
            )}

            {note && hasWritePermission && (
              <Button icon={<ShareAltOutlined />} onClick={() => setShowShareModal(true)}>
                Share
              </Button>
            )}

            {note && note.owner_id === (user?.id || userIdRef.current) && (
              <Popconfirm
                title="Delete note"
                description="Are you sure you want to delete this note? This action cannot be undone."
                onConfirm={deleteNote}
                okText="Yes, delete"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>

        <div
          style={{
            padding: '24px',
            background: token.colorBgContainer,
            borderRadius: token.borderRadius,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            minHeight: '600px',
          }}
        >
          {note?.note_type === 'code' ? (
            <CodeEditor
              content={content}
              onChange={handleContentChange as (content: string) => void}
              readOnly={!hasWritePermission}
            />
          ) : (
            <RichTextEditor
              content={content}
              onChange={handleContentChange as (content: string) => void}
              readOnly={!hasWritePermission}
            />
          )}
        </div>
      </Space>

      <Modal
        title="Share Note"
        open={showShareModal}
        onCancel={() => {
          setShowShareModal(false);
        }}
        footer={null}
      >
        <ShareNoteForm onClose={() => setShowShareModal(false)} noteId={noteId} />
      </Modal>

      <PricingModal open={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  );
};

// Separate component for the share form to avoid useForm warning
const ShareNoteForm = ({ onClose, noteId }: { onClose: () => void; noteId?: string }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { user } = useAuth();
  const [showPremiumWarning, setShowPremiumWarning] = useState(false);

  const shareNote = async (values: {
    user_email?: string;
    permission_level: 'read' | 'write' | 'admin';
  }) => {
    if (!noteId) return;

    // Non-premium users can only share with read permission
    const permissionLevel = isPremium ? values.permission_level : 'read';

    try {
      const result = await noteService.shareNote(noteId, {
        user_email: values.user_email || undefined,
        permission_level: permissionLevel,
        generate_link: !values.user_email,
      });

      if (result.share_url) {
        const fullUrl = `${globalThis.location.origin}${result.share_url}`;
        navigator.clipboard.writeText(fullUrl);
        message.success('Share link copied to clipboard!');
      } else {
        message.success('Note shared successfully!');
      }

      onClose();
      form.resetFields();
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { detail?: string } } };
      console.error('Error sharing note:', error);
      if (err.response?.status === 403) {
        const errorMsg = err.response?.data?.detail || 'Failed to share note';
        if (errorMsg.includes('premium') || errorMsg.includes('Team sharing')) {
          setShowPremiumWarning(true);
        } else {
          message.error(errorMsg);
        }
      } else {
        message.error('Failed to share note');
      }
    }
  };

  const userEmail = Form.useWatch('user_email', form);
  const isPremium = user?.is_premium || false;

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onFinish={shareNote}
        initialValues={{ permission_level: 'read' }}
      >
        <Form.Item
          label="User Email (optional - Premium Only)"
          name="user_email"
          rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          extra={!isPremium && '⭐ Team sharing requires Premium subscription'}
        >
          <Input
            placeholder="user@example.com"
            disabled={!isPremium}
            suffix={!isPremium && <Tag color="gold">Premium</Tag>}
          />
        </Form.Item>

        <Form.Item
          label="Permission Level"
          name="permission_level"
          rules={[{ required: true }]}
          extra={!isPremium && '⭐ Write and Admin permissions require Premium'}
        >
          <Select disabled={!isPremium && userEmail}>
            <Select.Option value="read">Read Only (View)</Select.Option>
            <Select.Option value="write" disabled={!isPremium}>
              Can Edit{' '}
              {!isPremium && (
                <Tag color="gold" style={{ marginLeft: 8 }}>
                  Premium
                </Tag>
              )}
            </Select.Option>
            <Select.Option value="admin" disabled={!isPremium}>
              Admin{' '}
              {!isPremium && (
                <Tag color="gold" style={{ marginLeft: 8 }}>
                  Premium
                </Tag>
              )}
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              onClick={() => {
                onClose();
                form.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              {userEmail ? 'Share with User' : 'Generate Share Link'}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {showPremiumWarning && (
        <Alert
          message="Premium Feature Required"
          description="Free users can only create read-only share links. Upgrade to Premium to share with edit permissions and share with specific team members!"
          type="warning"
          showIcon
          closable
          onClose={() => setShowPremiumWarning(false)}
          style={{ marginTop: 16 }}
        />
      )}
    </>
  );
};

export default NoteEditor;
