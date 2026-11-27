const focusSuggestions = {
  Education: [
    { title: 'Review lecture notes', description: 'Summarize the key ideas from your latest class and note anything to revisit.', category: 'Academic', estimated_duration_hours: '0.5' },
    { title: 'Prepare for an upcoming quiz', description: 'Review the covered topics and practice the questions you find most challenging.', category: 'Academic', estimated_duration_hours: '1' },
    { title: 'Make progress on an assignment', description: 'Review the assignment requirements and complete the next clear step.', category: 'Academic', estimated_duration_hours: '1.5' },
  ],
  'Projects and Tasks': [
    { title: 'Plan the next project milestone', description: 'Write down the next outcome you want to reach and the steps needed to get there.', estimated_duration_hours: '0.5' },
    { title: 'Break a large task into smaller steps', description: 'Turn one broad task into a short list of actions you can complete one at a time.', estimated_duration_hours: '0.5' },
    { title: 'Review project progress and blockers', description: 'Check what is complete, what is next, and what needs attention.', estimated_duration_hours: '0.5' },
  ],
  'Personal Productivity': [
    { title: 'Plan the week ahead', description: 'Choose a few priorities and make a realistic plan for when to work on them.', category: 'Personal', estimated_duration_hours: '0.5' },
    { title: 'Organize your workspace', description: 'Clear one area and prepare the materials you need for your next task.', category: 'Personal', estimated_duration_hours: '0.5' },
    { title: 'Schedule a short exercise session', description: 'Choose a simple activity and set aside time to move.', category: 'Personal', estimated_duration_hours: '0.5' },
  ],
  Work: [
    { title: 'Prepare a weekly work update', description: 'Summarize progress, upcoming priorities, and any blockers to share with your team.', category: 'Work', estimated_duration_hours: '1' },
    { title: 'Review current work assignments', description: 'Check your open responsibilities and identify the next action for each.', category: 'Work', estimated_duration_hours: '0.5' },
    { title: 'Organize your work schedule', description: 'Set aside focused time for your most important upcoming work.', category: 'Work', estimated_duration_hours: '0.5' },
  ],
  Other: [
    { title: 'Write down your next important task', description: 'Choose one useful next step and note what you need to complete it.', estimated_duration_hours: '0.5' },
    { title: 'Make a short plan for tomorrow', description: 'List a few priorities and prepare anything you will need.', estimated_duration_hours: '0.25' },
    { title: 'Tidy up one unfinished item', description: 'Choose an open task and decide whether to finish, schedule, or break it down.', estimated_duration_hours: '0.5' },
  ],
};

const categorySuggestions = {
  Academic: [
    { title: 'Review lecture notes', description: 'Summarize the key ideas from your latest class and note anything to revisit.', category: 'Academic', estimated_duration_hours: '0.5' },
    { title: 'Prepare for an upcoming quiz', description: 'Review the covered topics and practice the questions you find most challenging.', category: 'Academic', estimated_duration_hours: '1' },
    { title: 'Make progress on an assignment', description: 'Review the assignment requirements and complete the next clear step.', category: 'Academic', estimated_duration_hours: '1.5' },
  ],
  Personal: [
    { title: 'Plan the week ahead', description: 'Choose a few priorities and make a realistic plan for when to work on them.', category: 'Personal', estimated_duration_hours: '0.5' },
    { title: 'Organize your workspace', description: 'Clear one area and prepare the materials you need for your next task.', category: 'Personal', estimated_duration_hours: '0.5' },
    { title: 'Schedule a short exercise session', description: 'Choose a simple activity and set aside time to move.', category: 'Personal', estimated_duration_hours: '0.5' },
  ],
  Work: [
    { title: 'Prepare a weekly work update', description: 'Summarize progress, upcoming priorities, and any blockers to share with your team.', category: 'Work', estimated_duration_hours: '1' },
    { title: 'Review current work assignments', description: 'Check your open responsibilities and identify the next action for each.', category: 'Work', estimated_duration_hours: '0.5' },
    { title: 'Organize your work schedule', description: 'Set aside focused time for your most important upcoming work.', category: 'Work', estimated_duration_hours: '0.5' },
  ],
};

const generalSuggestions = [
  { title: 'Plan the week ahead', description: 'Choose a few priorities and make a realistic plan for when to work on them.', estimated_duration_hours: '0.5' },
  { title: 'Break a large task into smaller steps', description: 'Turn one broad task into a short list of actions you can complete one at a time.', estimated_duration_hours: '0.5' },
  { title: 'Organize your workspace', description: 'Clear one area and prepare the materials you need for your next task.', estimated_duration_hours: '0.5' },
  { title: 'Review an unfinished task', description: 'Choose one open item and decide on the next action you can take.', estimated_duration_hours: '0.5' },
];

/** Return deterministic task ideas from the saved two-step onboarding preferences. */
export function createTaskSuggestions(preferences = {}) {
  const focus = Array.isArray(preferences?.focus) ? preferences.focus : [];
  const categories = Array.isArray(preferences?.categories) ? preferences.categories : [];
  const groups = [];

  focus.forEach((area) => {
    const suggestions = (focusSuggestions[area] || []).map((suggestion) => {
      const preferredCategory = suggestion.category || (['Projects and Tasks', 'Other'].includes(area) ? categories[0] : '');
      const category = preferredCategory && categories.length && !categories.includes(preferredCategory)
        ? ''
        : preferredCategory;
      return { ...suggestion, category: category || '' };
    });
    if (suggestions.length) groups.push(suggestions);
  });

  categories.forEach((category) => {
    if (categorySuggestions[category]) groups.push(categorySuggestions[category]);
  });

  if (groups.length === 0) groups.push(generalSuggestions);

  const unique = [];
  const seen = new Set();
  for (let index = 0; unique.length < 5; index += 1) {
    let foundAtIndex = false;
    groups.forEach((group) => {
      const suggestion = group[index];
      if (!suggestion) return;
      foundAtIndex = true;
      const key = suggestion.title.toLocaleLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push({ ...suggestion, category: suggestion.category || '' });
    });
    if (!foundAtIndex) break;
  }

  return unique.slice(0, 5);
}

const suggestionFields = ['title', 'description', 'category', 'estimated_duration_hours'];

/** Apply only the editable task-content fields; require confirmation before replacing existing text. */
export function applyTaskSuggestion(currentForm, suggestion, replaceExisting = false) {
  const hasExistingContent = suggestionFields.some((field) => String(currentForm?.[field] || '').trim());
  if (hasExistingContent && !replaceExisting) {
    return { requiresConfirmation: true, form: currentForm };
  }

  const form = { ...currentForm };
  suggestionFields.forEach((field) => {
    form[field] = suggestion[field] ?? '';
  });
  return { requiresConfirmation: false, form };
}
