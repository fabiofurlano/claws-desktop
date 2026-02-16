import { create } from 'zustand';

export interface AutomationTask {
  id: string;
  name: string;
  type: 'cron' | 'hook';
  trigger: string;
  action_type: 'prompt' | 'script';
  action_data: string;
  is_active: boolean;
  created_at: string;
  last_run?: string;
}

export interface AutomationLog {
  id: string;
  task_id: string;
  run_at: number;
  status: 'success' | 'error';
  output: string | null;
}

interface AutomationState {
  tasks: AutomationTask[];
  logs: AutomationLog[];
  isLoading: boolean;
  isLoadingLogs: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  fetchLogs: (taskId?: string) => Promise<void>;
  createTask: (task: Omit<AutomationTask, 'id' | 'created_at'>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  tasks: [],
  logs: [],
  isLoading: false,
  isLoadingLogs: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await window.electron.automation.list();
      // Convert is_active from number to boolean
      const normalizedTasks = (tasks || []).map((t: any) => ({
        ...t,
        is_active: t.is_active === 1 || t.is_active === true
      }));
      set({ tasks: normalizedTasks, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch automation tasks:', error);
      set({ error: 'Failed to load tasks', isLoading: false, tasks: [] });
    }
  },

  fetchLogs: async (taskId?: string) => {
    set({ isLoadingLogs: true });
    try {
      const rawLogs = await window.electron.automation.getLogs(taskId);
      // Cast the status field to the correct type
      const logs = (rawLogs || []).map((l: any) => ({
        ...l,
        status: l.status as 'success' | 'error'
      }));
      set({ logs, isLoadingLogs: false });
    } catch (error) {
      console.error('Failed to fetch automation logs:', error);
      set({ logs: [], isLoadingLogs: false });
    }
  },

  createTask: async (task) => {
    set({ error: null });
    try {
      await window.electron.automation.create(task);
      await get().fetchTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      set({ error: 'Failed to create task' });
      throw error;
    }
  },

  toggleTask: async (id) => {
    set({ error: null });
    try {
      await window.electron.automation.toggle(id);
      await get().fetchTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      set({ error: 'Failed to update task' });
    }
  },

  deleteTask: async (id) => {
    set({ error: null });
    try {
      await window.electron.automation.delete(id);
      await get().fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      set({ error: 'Failed to delete task' });
    }
  },

  clearError: () => set({ error: null }),
}));
