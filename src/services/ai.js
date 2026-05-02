// ═══════════════════════════════════════════════════
// AI Service — Gemini API integration
// ═══════════════════════════════════════════════════

import { store } from '../state/store.js';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

async function callGemini(prompt) {
  const key = store.getState().settings.geminiApiKey;
  if (!key) throw new Error('NO_API_KEY');

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty AI response');

  try {
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1].trim());
    throw new Error('Failed to parse AI response as JSON');
  }
}

// ─── Task Breakdown ──────────────────────────────

export async function breakdownTask(taskText) {
  const now = new Date().toISOString();
  const prompt = `You are a productivity expert. A user wants to add this task to their todo list:

"${taskText}"

Your job:
1. If this is a simple, actionable task (e.g., "buy milk"), return it as-is with a time estimate.
2. If this is vague or complex (e.g., "learn frontend"), break it into a logical sequence of actionable subtasks.
3. Parse any natural language dates/times relative to NOW: ${now}
4. Assign a category from: Work, Personal, Learning, Health, Finance

Return JSON:
{
  "isComplex": true/false,
  "mainTask": {
    "title": "cleaned up title",
    "category": "Learning",
    "deadline": null or ISO timestamp,
    "estimatedMinutes": number or null
  },
  "subtasks": [
    {
      "title": "specific actionable step",
      "estimatedMinutes": number,
      "order": 0
    }
  ]
}

If not complex, subtasks should be an empty array.
Keep subtask titles concise and actionable. Max 8 subtasks.`;

  return callGemini(prompt);
}

// ─── Smart Reorder ───────────────────────────────

export async function reorderTasks(tasks, energyLevel, customPrompt = '') {
  if (tasks.length <= 1) return { orderedIds: tasks.map(t => t.id), reasoning: 'Only one task.' };

  const now = new Date().toISOString();
  const currentHour = new Date().getHours();

  const energyDescriptions = {
    peak: 'PEAK FOCUS — User is at maximum mental energy. Prioritize the most cognitively demanding and challenging tasks first. Put easy/routine tasks at the bottom.',
    high: 'HIGH ENERGY — User has strong energy. Favor challenging tasks but mix in some moderate ones to maintain flow.',
    balanced: 'BALANCED — Default mode. Order by a sensible mix of urgency, importance, and logical sequence.',
    moderate: 'MODERATE — User has decent energy but is not at peak. Avoid putting the hardest tasks first. Mix moderate and easy tasks.',
    low: 'LOW ENERGY — User is tired. Put the easiest, quickest wins first. Save complex tasks for later.',
    winding: 'WINDING DOWN — User is almost done for the day. Only light administrative or simple tasks. Complex work should be at the very bottom.'
  };

  const taskList = tasks.map((t, i) => {
    let desc = `[${t.id}] "${t.title}"`;
    if (t.category) desc += ` | category: ${t.category}`;
    if (t.deadline) desc += ` | deadline: ${t.deadline}`;
    if (t.estimatedMinutes) desc += ` | est: ${t.estimatedMinutes}min`;
    return desc;
  }).join('\n');

  const prompt = `You are a productivity assistant reordering a todo list.

CURRENT TIME: ${now} (hour: ${currentHour})
ENERGY LEVEL: ${energyDescriptions[energyLevel] || energyDescriptions.balanced}
${customPrompt ? `CUSTOM INSTRUCTION: "${customPrompt}"` : ''}

TASKS (current order):
${taskList}

INSTRUCTIONS:
- Compare tasks RELATIVE to each other to rank difficulty/complexity. Do NOT use absolute scales — instead ask "is task A harder than task B for this user?"
- Deadlines that are approaching (within 1-2 hours of current time) should be weighted heavily toward the top regardless of energy level.
- Overdue deadlines go to the very top.
- If a custom instruction is provided, it is the PRIMARY sorting criterion — override energy level preferences if they conflict.
- Consider logical dependencies (e.g., "prepare presentation" before "give presentation").
- Group related tasks together when it makes sense.

Return JSON:
{
  "orderedIds": ["id1", "id2", ...],
  "reasoning": "Brief 1-2 sentence explanation of the reorder logic"
}

Return ALL task IDs. Do not omit any.`;

  return callGemini(prompt);
}

export async function generateMoreSubtasks(mainTaskTitle, existingSubtasks) {
  const prompt = `You are a productivity expert. A user is breaking down the task: "${mainTaskTitle}".
Here are the subtasks they already have:
${existingSubtasks.map(t => `- ${t.title}`).join('\n')}

Please generate 3 to 5 MORE logical subtasks that should follow the existing ones, or fill in any missing steps. 
Do NOT repeat any existing subtasks.

Return JSON:
{
  "newSubtasks": [
    {
      "title": "specific actionable step",
      "estimatedMinutes": number
    }
  ]
}`;

  return callGemini(prompt);
}

export function hasApiKey() {
  return !!store.getState().settings.geminiApiKey;
}
