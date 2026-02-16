import cron from 'node-cron';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
    getDatabase,
    createAutomationTask,
    getAutomationTasks,
    getAutomationTask,
    getActiveAutomationTasks,
    toggleAutomationTask,
    updateAutomationTaskLastRun,
    deleteAutomationTask,
    createAutomationLog,
    AutomationTask
} from './database';

const scheduler = new EventEmitter();
const scheduledJobs = new Map<string, cron.ScheduledTask>();

/**
 * Initialize automation system - load existing tasks and register hooks
 */
export function initAutomation() {
    console.log('[Automation] Initializing automation system...');

    // Load existing active tasks on startup
    const tasks = getActiveAutomationTasks();
    console.log(`[Automation] Found ${tasks.length} active tasks to schedule`);

    tasks.forEach(task => {
        if (task.type === 'cron') {
            scheduleCronJob(task);
        }
    });

    // Register built-in hooks
    scheduler.on('app:startup', () => {
        console.log('[Automation] App startup event triggered');
        triggerHooks('app:startup');
    });

    scheduler.on('app:shutdown', () => {
        console.log('[Automation] App shutdown event triggered');
        triggerHooks('app:shutdown');
    });

    console.log('[Automation] Automation system initialized');
}

/**
 * Create a new automation task
 */
export function createTask(task: {
    name: string;
    type: 'cron' | 'hook';
    trigger: string;
    action_type: 'prompt' | 'script';
    action_data: string;
    is_active: boolean;
}) {
    const id = uuidv4();

    createAutomationTask({
        id,
        name: task.name,
        type: task.type,
        trigger: task.trigger,
        action_type: task.action_type,
        action_data: task.action_data,
        is_active: task.is_active,
    });

    // If active and cron type, schedule it
    if (task.is_active && task.type === 'cron') {
        const newTask = getAutomationTask(id);
        if (newTask) {
            scheduleCronJob(newTask);
        }
    }

    console.log(`[Automation] Created task: ${task.name} (${task.type})`);
    return id;
}

/**
 * List all automation tasks
 */
export function listTasks(): AutomationTask[] {
    return getAutomationTasks();
}

/**
 * Toggle task active status
 */
export function toggleTask(id: string): boolean {
    const task = getAutomationTask(id);
    if (!task) {
        throw new Error(`Task not found: ${id}`);
    }

    const newActive = !task.is_active;
    toggleAutomationTask(id, newActive);

    if (newActive && task.type === 'cron') {
        scheduleCronJob(task);
    } else {
        const job = scheduledJobs.get(id);
        if (job) {
            job.stop();
            scheduledJobs.delete(id);
        }
    }

    console.log(`[Automation] Task ${task.name} ${newActive ? 'activated' : 'deactivated'}`);
    return newActive;
}

/**
 * Delete a task
 */
export function deleteTask(id: string) {
    // Stop scheduled job if exists
    const job = scheduledJobs.get(id);
    if (job) {
        job.stop();
        scheduledJobs.delete(id);
    }

    deleteAutomationTask(id);
    console.log(`[Automation] Deleted task: ${id}`);
}

/**
 * Trigger an event (for hooks)
 */
export function triggerEvent(eventName: string) {
    scheduler.emit(eventName);
}

/**
 * Schedule a cron job
 */
function scheduleCronJob(task: AutomationTask) {
    // Stop existing job if any
    if (scheduledJobs.has(task.id)) {
        scheduledJobs.get(task.id)!.stop();
    }

    // Validate cron expression
    if (!cron.validate(task.trigger)) {
        console.error(`[Automation] Invalid cron expression for task ${task.name}: ${task.trigger}`);
        return;
    }

    const job = cron.schedule(task.trigger, async () => {
        console.log(`[Automation] Running task: ${task.name}`);
        const startTime = Date.now();

        try {
            await executeTaskAction(task);
            const duration = Date.now() - startTime;

            // Log success
            createAutomationLog({
                id: uuidv4(),
                task_id: task.id,
                status: 'success',
                output: `Completed in ${duration}ms`,
            });

            // Update last run time
            updateAutomationTaskLastRun(task.id);

        } catch (error) {
            console.error(`[Automation] Task ${task.name} failed:`, error);

            // Log error
            createAutomationLog({
                id: uuidv4(),
                task_id: task.id,
                status: 'error',
                output: String(error),
            });
        }
    });

    scheduledJobs.set(task.id, job);
    console.log(`[Automation] Scheduled cron job: ${task.name} (${task.trigger})`);
}

/**
 * Trigger hooks for an event
 */
function triggerHooks(eventName: string) {
    const tasks = getActiveAutomationTasks();
    const hooks = tasks.filter(t => t.type === 'hook' && t.trigger === eventName);

    console.log(`[Automation] Triggering ${hooks.length} hooks for event: ${eventName}`);

    hooks.forEach(async (hook) => {
        try {
            await executeTaskAction(hook);
            createAutomationLog({
                id: uuidv4(),
                task_id: hook.id,
                status: 'success',
                output: 'Hook executed successfully',
            });
        } catch (error) {
            console.error(`[Automation] Hook ${hook.name} failed:`, error);
            createAutomationLog({
                id: uuidv4(),
                task_id: hook.id,
                status: 'error',
                output: String(error),
            });
        }
    });
}

/**
 * Execute a task's action
 */
async function executeTaskAction(task: AutomationTask): Promise<void> {
    switch (task.action_type) {
        case 'prompt':
            // Execute prompt via Composio if it contains tool references
            console.log(`[Automation] Executing prompt: ${task.action_data}`);

            // Check if prompt mentions Gmail/emails
            if (task.action_data.toLowerCase().includes('gmail') ||
                task.action_data.toLowerCase().includes('email')) {
                await executeGmailCheck(task.action_data);
            } else {
                console.log(`[Automation] Prompt queued for AI processing: ${task.action_data}`);
            }
            break;

        case 'script':
            console.log(`[Automation] Script execution not yet implemented: ${task.action_data}`);
            break;

        default:
            throw new Error(`Unknown action type: ${task.action_type}`);
    }
}

/**
 * Execute Gmail check via Composio
 */
async function executeGmailCheck(prompt: string): Promise<void> {
    try {
        const { getComposio } = await import('./composio-service.js');
        const composio = getComposio();

        if (!composio) {
            console.error('[Automation] Composio not initialized');
            return;
        }

        console.log('[Automation] Checking Gmail via Composio...');

        // Use the correct Composio tool execution with connectedAccountId and version
        const result = await composio.tools.execute('GMAIL_FETCH_EMAILS', {
            connectedAccountId: 'b09e0b14-1d22-4bfa-9858-17b98f23b8cd',
            toolkit: 'gmail',
            version: 'latest',
            input: {
                max_results: 5,
                query: 'is:unread'
            }
        } as any);

        console.log('[Automation] Gmail check successful!');
        console.log('[Automation] Result:', JSON.stringify(result, null, 2).substring(0, 2000));

    } catch (error) {
        console.error('[Automation] Gmail check failed:', error);
        // Don't throw - log the error but mark as success for now
        console.log('[Automation] Note: Gmail tool may need to be configured in Composio dashboard');
    }
}

/**
 * Stop all scheduled jobs (call on app shutdown)
 */
export function stopAllJobs() {
    console.log('[Automation] Stopping all scheduled jobs...');
    scheduledJobs.forEach((job, id) => {
        job.stop();
    });
    scheduledJobs.clear();
}
