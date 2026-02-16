import React, { useEffect, useState } from 'react';
import { useAutomationStore, AutomationTask } from '../stores/automation-store';
import { useMode } from '../stores/mode-store';

interface AutomationDashboardProps {
  onClose?: () => void;
}

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({ onClose }) => {
  const { tasks, isLoading, fetchTasks, toggleTask, deleteTask } = useAutomationStore();
  const mode = useMode();
  const [showAddModal, setShowAddModal] = useState(false);

  const isAgent = mode === 'agent';

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const cronTasks = tasks.filter(t => t.type === 'cron');
  const hooks = tasks.filter(t => t.type === 'hook');

  return (
    <div className={`min-h-screen p-6 ${isAgent ? 'bg-agent-bg text-agent-text' : 'bg-chat-bg text-chat-text'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isAgent ? 'bg-agent-surfaceAlt text-agent-muted hover:text-agent-text' : 'bg-gray-100 text-chat-muted hover:text-chat-text'}`}
              >
                ← Back
              </button>
            )}
            <h1 className="text-2xl font-bold">Automation Dashboard</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-all
              ${isAgent ? 'bg-agent-primary text-white hover:bg-agent-primary/90' : 'bg-chat-primary text-white hover:bg-chat-primary/90'}`}
          >
            + Add Task
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className={isAgent ? 'text-agent-muted' : 'text-chat-muted'}>Loading tasks...</p>
          </div>
        ) : (
          <>
            {/* Scheduled Tasks */}
            <section className="mb-8">
              <h2 className={`text-lg font-semibold mb-4 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                Scheduled Tasks ({cronTasks.length})
              </h2>
              {cronTasks.length === 0 ? (
                <EmptyState isAgent={isAgent} message="No scheduled tasks yet" />
              ) : (
                <div className="space-y-3">
                  {cronTasks.map(task => (
                    <TaskCard key={task.id} task={task} isAgent={isAgent} onToggle={toggleTask} onDelete={deleteTask} />
                  ))}
                </div>
              )}
            </section>

            {/* Event Hooks */}
            <section>
              <h2 className={`text-lg font-semibold mb-4 ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
                Event Hooks ({hooks.length})
              </h2>
              {hooks.length === 0 ? (
                <EmptyState isAgent={isAgent} message="No event hooks configured" />
              ) : (
                <div className="space-y-3">
                  {hooks.map(task => (
                    <TaskCard key={task.id} task={task} isAgent={isAgent} onToggle={toggleTask} onDelete={deleteTask} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showAddModal && <AddTaskModal isAgent={isAgent} onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

// ==================== Task Card ====================

const TaskCard: React.FC<{
  task: AutomationTask;
  isAgent: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ task, isAgent, onToggle, onDelete }) => (
  <div className={`rounded-xl border p-4 ${isAgent ? 'bg-agent-surface border-agent-border' : 'bg-white border-chat-border'}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="font-medium">{task.name}</h3>
        <p className={`text-sm ${isAgent ? 'text-agent-muted' : 'text-chat-muted'}`}>
          {task.type === 'cron' ? `📅 ${formatSchedule(task.trigger)}` : `⚡ ${task.trigger}`}
        </p>
        <p className={`text-xs mt-1 ${isAgent ? 'text-agent-muted/70' : 'text-chat-muted/70'}`}>
          {task.action_type === 'prompt' ? 'Prompt' : 'Script'}: {task.action_data.substring(0, 50)}...
        </p>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={() => onToggle(task.id)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors
            ${task.is_active
              ? 'bg-green-500/20 text-green-500'
              : isAgent ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
            }`}
        >
          {task.is_active ? 'Active' : 'Paused'}
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this task?')) {
              onDelete(task.id);
            }
          }}
          className={`px-2 py-1 rounded text-xs ${isAgent ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ==================== Empty State ====================

const EmptyState: React.FC<{ isAgent: boolean; message: string }> = ({ isAgent, message }) => (
  <div className={`rounded-xl border p-8 text-center ${isAgent ? 'bg-agent-surface border-agent-border' : 'bg-white border-chat-border'}`}>
    <div className="text-3xl mb-2">📭</div>
    <p className={isAgent ? 'text-agent-muted' : 'text-chat-muted'}>{message}</p>
  </div>
);

// ==================== Add Task Modal ====================

const AddTaskModal: React.FC<{ isAgent: boolean; onClose: () => void }> = ({ isAgent, onClose }) => {
  const { createTask } = useAutomationStore();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'minute' | 'hour' | 'day' | 'month'>('day');
  const [time, setTime] = useState('08:00');
  const [actionType, setActionType] = useState<'prompt' | 'script'>('prompt');
  const [actionData, setActionData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCronExpression = () => {
    const [hour, minute] = time.split(':').map(Number);

    switch (frequency) {
      case 'minute': return '* * * * *';
      case 'hour': return `${minute} * * * *`;
      case 'day': return `${minute} ${hour} * * *`;
      case 'month': return `${minute} ${hour} 1 * *`;
      default: return `${minute} ${hour} * * *`;
    }
  };

  const getPreviewText = () => {
    switch (frequency) {
      case 'minute': return 'Every minute';
      case 'hour': return 'Every hour';
      case 'day': return `Every day at ${time}`;
      case 'month': return `Every month on the 1st at ${time}`;
      default: return '';
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !actionData.trim()) return;

    setIsSubmitting(true);
    try {
      await createTask({
        name: name.trim(),
        type: 'cron',
        trigger: getCronExpression(),
        action_type: actionType,
        action_data: actionData.trim(),
        is_active: true,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-xl p-6 ${isAgent ? 'bg-agent-surface border border-agent-border' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Create New Task</h2>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Task Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm
              ${isAgent ? 'bg-agent-bg border-agent-border text-agent-text' : 'bg-white border-chat-border text-chat-text'}`}
            placeholder="Morning Briefing"
          />
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">How often?</label>
          <div className="grid grid-cols-4 gap-2">
            {(['minute', 'hour', 'day', 'month'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`py-2 rounded-lg text-sm font-medium capitalize transition-all
                  ${frequency === f
                    ? isAgent ? 'bg-agent-primary text-white' : 'bg-chat-primary text-white'
                    : isAgent ? 'bg-agent-bg text-agent-muted' : 'bg-gray-100 text-chat-muted'
                  }`}
              >
                Every {f}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        {frequency !== 'minute' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">At what time?</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm
                ${isAgent ? 'bg-agent-bg border-agent-border text-agent-text' : 'bg-white border-chat-border text-chat-text'}`}
            />
          </div>
        )}

        {/* Action Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Action Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActionType('prompt')}
              className={`py-2 rounded-lg text-sm font-medium transition-all
                ${actionType === 'prompt'
                  ? isAgent ? 'bg-agent-primary text-white' : 'bg-chat-primary text-white'
                  : isAgent ? 'bg-agent-bg text-agent-muted' : 'bg-gray-100 text-chat-muted'
                }`}
            >
              Send Prompt
            </button>
            <button
              onClick={() => setActionType('script')}
              className={`py-2 rounded-lg text-sm font-medium transition-all
                ${actionType === 'script'
                  ? isAgent ? 'bg-agent-primary text-white' : 'bg-chat-primary text-white'
                  : isAgent ? 'bg-agent-bg text-agent-muted' : 'bg-gray-100 text-chat-muted'
                }`}
            >
              Run Script
            </button>
          </div>
        </div>

        {/* Action Data */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            {actionType === 'prompt' ? 'Prompt' : 'Script Path'}
          </label>
          {actionType === 'prompt' ? (
            <textarea
              value={actionData}
              onChange={e => setActionData(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm min-h-[80px]
                ${isAgent ? 'bg-agent-bg border-agent-border text-agent-text' : 'bg-white border-chat-border text-chat-text'}`}
              placeholder="Good morning! Generate my daily briefing..."
            />
          ) : (
            <input
              value={actionData}
              onChange={e => setActionData(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm
                ${isAgent ? 'bg-agent-bg border-agent-border text-agent-text' : 'bg-white border-chat-border text-chat-text'}`}
              placeholder="/path/to/script.py"
            />
          )}
        </div>

        {/* Preview */}
        <div className={`text-sm mb-4 p-2 rounded-lg ${isAgent ? 'bg-agent-bg text-agent-primary' : 'bg-gray-50 text-chat-primary'}`}>
          <strong>Preview:</strong> "{getPreviewText()}"
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium
              ${isAgent ? 'bg-agent-surfaceAlt text-agent-muted hover:text-agent-text' : 'bg-gray-100 text-chat-muted hover:text-chat-text'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || !actionData.trim() || isSubmitting}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40
              ${isAgent ? 'bg-agent-primary hover:bg-agent-primary/90' : 'bg-chat-primary hover:bg-chat-primary/90'}`}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Helper Functions ====================

function formatSchedule(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth] = parts;

  // Every minute
  if (minute === '*' && hour === '*') return 'Every minute';

  // Every hour
  if (minute !== '*' && hour === '*') return `Every hour at minute ${minute}`;

  // Every day
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*') {
    return `Every day at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  // Every month
  if (minute !== '*' && hour !== '*' && dayOfMonth !== '*') {
    return `Every month on day ${dayOfMonth} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  return cron;
}
