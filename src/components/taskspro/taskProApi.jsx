import { base44 } from "@/api/base44Client";

const T = base44.entities.TaskPro;
const Attendee = base44.entities.TaskProAttendee;
const Comment = base44.entities.TaskProComment;
const Attachment = base44.entities.TaskProAttachment;
const Activity = base44.entities.TaskProActivity;
const Reminder = base44.entities.TaskProReminder;
const Rule = base44.entities.TaskProRecurrenceRule;
const Template = base44.entities.TaskProTemplate;
const SavedView = base44.entities.TaskProSavedView;

// ─── Tasks ───────────────────────────────────────────────
export const fetchTasks = () => T.list("-created_date", 200);
export const createTask = (data) => T.create(data);
export const updateTask = (id, data) => T.update(id, data);
export const deleteTask = (id) => T.delete(id);

export const updateStatus = (id, status) =>
  T.update(id, { status, ...(status === "הושלמה" ? { completed_at: new Date().toISOString() } : {}) });

export const updateManualOrder = (id, order) => T.update(id, { manual_order: order });

export const updatePriority = (id, priority) => T.update(id, { priority });

export const archiveTask = (id, reason, by) =>
  T.update(id, { is_archived: true, archived_at: new Date().toISOString(), archived_by: by, archive_reason: reason || "" });

export const unarchiveTask = (id) =>
  T.update(id, { is_archived: false, archived_at: null, archived_by: null, archive_reason: null });

// ─── Bulk ─────────────────────────────────────────────────
export const bulkUpdateStatus = (ids, status) =>
  Promise.all(ids.map((id) => updateStatus(id, status)));

export const bulkUpdatePriority = (ids, priority) =>
  Promise.all(ids.map((id) => updatePriority(id, priority)));

export const bulkAssign = (ids, assigned_to, assigned_to_name) =>
  Promise.all(ids.map((id) => T.update(id, { assigned_to, assigned_to_name })));

export const bulkArchive = (ids, reason, by) =>
  Promise.all(ids.map((id) => archiveTask(id, reason, by)));

export const bulkUnarchive = (ids) =>
  Promise.all(ids.map((id) => unarchiveTask(id)));

export const bulkDelete = (ids) =>
  Promise.all(ids.map((id) => T.delete(id)));

// ─── Attendees ────────────────────────────────────────────
export const fetchAttendees = (taskId) =>
  Attendee.filter({ task_id: taskId });

export const addAttendee = (taskId, user) =>
  Attendee.create({ task_id: taskId, user_username: user.username, user_name: user.name || user.full_name, user_email: user.email, role: "attendee" });

export const removeAttendee = (attendeeId) => Attendee.delete(attendeeId);

export const replaceAttendees = async (taskId, users) => {
  const existing = await fetchAttendees(taskId);
  await Promise.all(existing.map((a) => Attendee.delete(a.id)));
  if (users.length > 0) {
    await Promise.all(users.map((u) => addAttendee(taskId, u)));
  }
};

// ─── Comments ─────────────────────────────────────────────
export const fetchComments = (taskId) =>
  Comment.filter({ task_id: taskId, is_deleted: false });

export const createComment = (taskId, text, user) =>
  Comment.create({ task_id: taskId, comment_text: text, created_by_username: user.username, created_by_name: user.name || user.full_name });

export const updateComment = (id, text) =>
  Comment.update(id, { comment_text: text, is_edited: true });

export const deleteComment = (id) =>
  Comment.update(id, { is_deleted: true, deleted_at: new Date().toISOString() });

// ─── Attachments ──────────────────────────────────────────
export const fetchAttachments = (taskId) =>
  Attachment.filter({ task_id: taskId, is_deleted: false });

export const uploadAttachment = async (taskId, file, user) => {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return Attachment.create({
    task_id: taskId,
    file_url,
    file_name: file.name,
    file_display_name: file.name,
    file_type: file.type,
    file_size_bytes: file.size,
    uploaded_by_username: user.username,
    uploaded_by_name: user.name || user.full_name
  });
};

export const deleteAttachment = (id) =>
  Attachment.update(id, { is_deleted: true, deleted_at: new Date().toISOString() });

// ─── Activity ─────────────────────────────────────────────
export const fetchActivity = (taskId) =>
  Activity.filter({ task_id: taskId });

export const logActivity = (taskId, type, user, payload = {}) =>
  Activity.create({
    task_id: taskId,
    activity_type: type,
    actor_username: user.username,
    actor_name: user.name || user.full_name,
    payload_json: JSON.stringify(payload)
  });

// ─── Reminders ────────────────────────────────────────────
export const fetchReminders = (taskId) =>
  Reminder.filter({ task_id: taskId });

export const createReminder = (taskId, data) =>
  Reminder.create({ task_id: taskId, ...data });

export const updateReminder = (id, data) => Reminder.update(id, data);

export const deleteReminder = (id) =>
  Reminder.update(id, { status: "canceled" });

// ─── Recurrence ───────────────────────────────────────────
export const fetchRules = () => Rule.list("-created_date");
export const createRule = (data) => Rule.create(data);
export const updateRule = (id, data) => Rule.update(id, data);
export const deleteRule = (id) => Rule.delete(id);
export const pauseRule = (id) => Rule.update(id, { is_paused: true });
export const resumeRule = (id) => Rule.update(id, { is_paused: false });
export const stopRule = (id) => Rule.update(id, { is_active: false });

// ─── Templates ────────────────────────────────────────────
export const fetchTemplates = () => Template.filter({ is_active: true });
export const createTemplate = (data) => Template.create(data);
export const updateTemplate = (id, data) => Template.update(id, data);
export const deleteTemplate = (id) => Template.delete(id);

export const createTaskFromTemplate = async (templateId, overrides = {}) => {
  const tpl = await Template.list();
  const t = tpl.find((x) => x.id === templateId);
  if (!t) throw new Error("תבנית לא נמצאה");
  const due = t.due_days_from_now
    ? new Date(Date.now() + t.due_days_from_now * 86400000).toISOString()
    : null;
  return T.create({
    title: t.name,
    task_type: t.task_type,
    priority: t.default_priority || "בינונית",
    status: t.default_status || "פתוחה",
    description: t.default_description || "",
    assigned_to: t.default_assigned_to || "",
    assigned_to_name: t.default_assigned_to_name || "",
    due_at: due,
    source: "template",
    template_id: templateId,
    ...overrides
  });
};

// ─── Saved Views ──────────────────────────────────────────
export const fetchSavedViews = (username) =>
  SavedView.filter({ owner_username: username });

export const createSavedView = (data) => SavedView.create(data);
export const updateSavedView = (id, data) => SavedView.update(id, data);
export const deleteSavedView = (id) => SavedView.delete(id);

// ─── Lookups ──────────────────────────────────────────────
export const fetchAppUsers = () => base44.entities.AppUser.list();
export const fetchDebtors = () => base44.entities.DebtorRecord.filter({ isArchived: false });