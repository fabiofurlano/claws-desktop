// Test script to create a Gmail automation task
// Run with: node scripts/create-gmail-automation.js

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claws', 'claws_memory.db');
const db = new Database(dbPath);

// Create the automation task
const id = 'gmail-check-' + Date.now();
const stmt = db.prepare(`
  INSERT INTO automation_tasks (id, name, type, trigger, action_type, action_data, is_active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const result = stmt.run(
  id,
  'Daily Gmail Check',
  'cron',
  '0 9 * * *', // Every day at 9:00 AM
  'prompt',
  'Check my Gmail for unread emails and summarize the latest 10 emails. Report any important messages.',
  1,
  Date.now()
);

console.log('Created automation task:', id);
console.log('Changes:', result.changes);

// Verify it was created
const tasks = db.prepare('SELECT * FROM automation_tasks').all();
console.log('\nAll automation tasks:');
tasks.forEach(t => {
  console.log(`- ${t.name} (${t.type}): ${t.trigger} - Active: ${t.is_active}`);
});

db.close();
