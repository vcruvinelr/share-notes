import api from './api';
import type {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  ShareNoteRequest,
  ShareNoteResponse,
} from '../types';

export const noteService = {
  // Get current user info (creates anonymous user if needed)
  getCurrentUser: async (): Promise<{
    id: string;
    username: string;
    email: string | null;
    is_anonymous: boolean;
  }> => {
    const response = await api.get('/api/notes/me');
    const userData = response.data;

    // Store anonymous user ID in localStorage if user is anonymous
    if (userData.is_anonymous && userData.id) {
      localStorage.setItem('anonymousUserId', userData.id);
      console.log('[NoteService] Stored anonymous user ID:', userData.id);
    }

    return userData;
  },

  // Get all notes
  getNotes: async (): Promise<Note[]> => {
    const response = await api.get<Note[]>('/api/notes/');
    return response.data;
  },

  // Get a single note
  getNote: async (noteId: string): Promise<Note> => {
    const response = await api.get<Note>(`/api/notes/${noteId}`);
    return response.data;
  },

  // Create a new note
  createNote: async (noteData: CreateNoteRequest): Promise<Note> => {
    const response = await api.post<Note>('/api/notes/', noteData);
    return response.data;
  },

  // Update a note
  updateNote: async (noteId: string, noteData: UpdateNoteRequest): Promise<Note> => {
    const response = await api.put<Note>(`/api/notes/${noteId}`, noteData);
    return response.data;
  },

  // Delete a note
  deleteNote: async (noteId: string): Promise<void> => {
    await api.delete(`/api/notes/${noteId}`);
  },

  // Share a note
  shareNote: async (noteId: string, shareData: ShareNoteRequest): Promise<ShareNoteResponse> => {
    const response = await api.post<ShareNoteResponse>(`/api/notes/${noteId}/share`, shareData);
    return response.data;
  },

  // Get shared note
  getSharedNote: async (shareToken: string): Promise<Note> => {
    const response = await api.get<Note>(`/api/notes/shared/${shareToken}`);
    return response.data;
  },
};
