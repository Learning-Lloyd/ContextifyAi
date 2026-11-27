/** Save a task once and return the server's saved task without requesting analysis. */
export async function saveTaskWithoutAnalysis({ saveTask, taskData }) {
  const response = await saveTask(taskData);
  return response?.task ?? response;
}
