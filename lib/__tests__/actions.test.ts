import { createPoll, updatePoll, updatePollSettings, deletePoll, submitVote, sendPasswordResetEmail, updatePassword } from '../actions';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock the next/headers cookies function
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock the @supabase/ssr createServerClient function
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
      updateUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-poll-id' }, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        in: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
        })),
      })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

// Mock revalidatePath and redirect
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    });

    // Ensure createServerClient is reset for each test to allow dynamic mocks
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        updateUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        resetPasswordForEmail: jest.fn(() => Promise.resolve({ data: null, error: null })),
      },
      from: jest.fn((tableName: string) => {
        if (tableName === 'polls') {
          return {
            insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: { id: 'test-poll-id' }, error: null })) }) )})),
            update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) })),
            delete: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) })),
          };
        }
        if (tableName === 'poll_options') {
          return {
            insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          };
        }
        if (tableName === 'votes') {
          return {
            select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })) })) })) })),
            insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          };
        }
        return jest.fn();
      }),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });
  });

  // Test cases for createPoll
  describe('createPoll', () => {
    it('should create a poll successfully', async () => {
      const formData = new FormData();
      formData.append('question', 'Test Question');
      formData.append('option-0', 'Option 1');
      formData.append('option-1', 'Option 2');

      const result = await createPoll(formData);

      // expect(result).toEqual({ message: 'Poll created successfully!' }); // Removed as redirect is called
      expect(createServerClient).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/polls');
    });

    it('should return an error if user is not authenticated', async () => {
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        },
      });

      const formData = new FormData();
      formData.append('question', 'Test Question');
      formData.append('option-0', 'Option 1');

      const result = await createPoll(formData);

      expect(result).toEqual({ message: 'User not authenticated.' });
    });

    it('should return an error if question is empty', async () => {
      const formData = new FormData();
      formData.append('question', '');
      formData.append('option-0', 'Option 1');

      const result = await createPoll(formData);

      expect(result).toEqual({ message: 'Please provide a question and at least one non-empty option.' });
    });

    it('should return an error if no options are provided', async () => {
      const formData = new FormData();
      formData.append('question', 'Test Question');

      const result = await createPoll(formData);

      expect(result).toEqual({ message: 'Please provide a question and at least one non-empty option.' });
    });

    it('should return an error if poll creation fails', async () => {
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
        from: jest.fn(() => ({
          insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: new Error('DB Error') })) }) )})),
        })),
      });

      const formData = new FormData();
      formData.append('question', 'Test Question');
      formData.append('option-0', 'Option 1');

      const result = await createPoll(formData);

      expect(result).toEqual({ message: 'Failed to create poll.' });
    });

    it('should return an error if option creation fails', async () => {
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
        from: jest.fn((tableName: string) => {
          if (tableName === 'polls') {
            return {
              insert: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({ data: { id: 'test-poll-id' }, error: null })),
                })),
              })),
              update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) })),
              delete: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })),
            };
          }
          if (tableName === 'poll_options') {
            return {
              insert: jest.fn(() => ({ error: new Error('Options DB Error') })),
            };
          }
          return jest.fn();
        }),
      });

      const formData = new FormData();
      formData.append('question', 'Test Question');
      formData.append('option-0', 'Option 1');

      const result = await createPoll(formData);

      expect(result).toEqual({ message: 'Failed to create poll options.' });
    });
  });

  // Test cases for updatePoll
  describe('updatePoll', () => {
    it('should update a poll successfully', async () => {
      const formData = new FormData();
      formData.append('id', 'test-poll-id');
      formData.append('question', 'Updated Question');
      formData.append('description', 'Updated Description');
      formData.append('options_json', JSON.stringify(['Updated Option 1', 'Updated Option 2']));
      formData.append('allowMultipleOptions', 'on');
      formData.append('isPrivate', 'on');

      // Mock existing options to simulate update/insert/delete logic
      const mockExistingOptions = [
        { id: 'opt-1', option_text: 'Original Option 1' },
        { id: 'opt-2', option_text: 'Original Option 2' },
      ];

      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
        from: jest.fn((tableName: string) => {
          if (tableName === 'polls') {
            return {
              update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) })),
            };
          }
          if (tableName === 'poll_options') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => Promise.resolve({ data: mockExistingOptions, error: null })),
              })),
              delete: jest.fn(() => ({ in: jest.fn(() => Promise.resolve({ data: null, error: null })) })),
              insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
            };
          }
          return jest.fn();
        }),
      });

      const result = await updatePoll(formData);

      expect(result).toEqual({ message: 'Poll updated successfully!' });
      expect(revalidatePath).toHaveBeenCalledWith('/polls/test-poll-id');
      expect(revalidatePath).toHaveBeenCalledWith('/polls');
    });

    it('should return an error if poll ID is missing', async () => {
      const formData = new FormData();
      formData.append('question', 'Updated Question');

      const result = await updatePoll(formData);

      expect(result).toEqual({ message: 'Poll ID is missing.' });
    });
  });

  // Test cases for updatePollSettings
  describe('updatePollSettings', () => {
    it('should update poll settings successfully', async () => {
      const formData = new FormData();
      formData.append('id', 'test-poll-id');
      formData.append('allowMultipleOptions', 'on');
      formData.append('isPrivate', 'on');

      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
        from: jest.fn((tableName: string) => {
          if (tableName === 'polls') {
            return {
              update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) })),
            };
          }
          return jest.fn();
        }),
      });

      const result = await updatePollSettings(formData);

      expect(result).toEqual({ message: 'Poll settings updated successfully!' });
      expect(revalidatePath).toHaveBeenCalledWith('/polls/test-poll-id');
      expect(revalidatePath).toHaveBeenCalledWith('/polls');
    });
  });

  // Test cases for deletePoll
  describe('deletePoll', () => {
    it('should delete a poll successfully', async () => {
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
        from: jest.fn((tableName: string) => {
          if (tableName === 'polls') {
            return {
              delete: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })) })),
            };
          }
          return jest.fn();
        }),
      });

      const result = await deletePoll('test-poll-id');

      expect(result).toEqual({ message: 'Poll deleted successfully!' });
      expect(revalidatePath).toHaveBeenCalledWith('/polls');
    });
  });

  // Test cases for submitVote
  describe('submitVote', () => {
    it('should submit a vote successfully', async () => {
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
        from: jest.fn((tableName: string) => {
          if (tableName === 'votes') {
            return {
              select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })) })) })) })),
              insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
            };
          }
          return jest.fn();
        }),
        rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
      });

      const result = await submitVote('test-poll-id', 'test-option-id');

      expect(result).toEqual({ message: 'Vote submitted successfully!' });
      expect(revalidatePath).toHaveBeenCalledWith('/polls/test-poll-id');
    });
  });

  // Test cases for sendPasswordResetEmail
  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
          resetPasswordForEmail: jest.fn(() => Promise.resolve({ data: null, error: null })),
        },
      });

      const result = await sendPasswordResetEmail('test@example.com');

      expect(result).toEqual({ message: 'Password reset email sent. Check your inbox!' });
    });
  });

  // Test cases for updatePassword
  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      (createServerClient as jest.Mock).mockReturnValue({
        auth: {
          getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
          updateUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
        },
      });

      const result = await updatePassword('new-password');

      expect(result).toEqual({ message: 'Your password has been reset successfully!' });
    });
  });
});
