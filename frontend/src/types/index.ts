export interface User {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  is_premium?: boolean;
}

export interface Note {
  id: string;
  title: string;
  note_type: 'standard' | 'code';
  content: string;
  owner_id: string | null;
  is_public: boolean;
  share_token?: string | null;
  share_permission_level?: string | null;
  created_at: string;
  updated_at: string;
  permissions?: NotePermission[];
}

export interface NotePermission {
  id: string;
  note_id: string;
  user_id: string;
  permission_level: 'read' | 'write' | 'admin';
  created_at: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  note_type: 'standard' | 'code';
  is_public: boolean;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  note_type?: 'standard' | 'code';
  is_public?: boolean;
}

export interface ShareNoteRequest {
  user_email?: string;
  permission_level: 'read' | 'write' | 'admin';
  generate_link?: boolean;
}

export interface ShareNoteResponse {
  share_url?: string;
  message?: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface EditMessage extends WebSocketMessage {
  type: 'edit';
  operation: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
  user_id: string;
  username: string;
}

export interface CursorMessage extends WebSocketMessage {
  type: 'cursor';
  user_id: string;
  username: string;
  position: number;
  selection_end: number;
}

export interface UserJoinedMessage extends WebSocketMessage {
  type: 'user_joined';
  user_id: string;
  username: string;
}

export interface UserLeftMessage extends WebSocketMessage {
  type: 'user_left';
  user_id: string;
  username: string;
}

export interface UserListMessage extends WebSocketMessage {
  type: 'user_list';
  users: Array<{ user_id: string; username: string }>;
}

export interface ContentMessage extends WebSocketMessage {
  type: 'content';
  content: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
  code?: string;
}
}

export interface CursorPosition {
  username: string;
  position: number;
  selection_end: number;
}
