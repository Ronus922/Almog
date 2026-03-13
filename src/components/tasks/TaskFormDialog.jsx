import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay, isBefore, isAfter } from "date-fns";
import TaskAuditLogTab from "@/components/tasks/TaskAuditLogTab";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

const TRACKED_FIELDS = ["task_type", "status", "priority", "due_date", "assigned_to_name", "description", "completion_notes"];

const TASK_TYPES = ["שיחת טלפון", "שליחת מכתב התראה", "פגישה", "מעקב תשלום", "הגשת תביעה", "אחר"];
const PRIORITIES = ["גבוהה", "בינונית", "נמוכה"];
const STATUSES = ["פתוחה", "בטיפול", "הושלמה", "בוטלה", "לא השתנה"];

export default function TaskFormDialog({ open, onClose, task, debtorRecord, onSaved, currentUser }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    task_type: "",
    priority: "",
    status: "",
    description: "",
    due_date: "",
    assigned_to: "",
    assigned_to_name: "",
    debtor_record_id: "",
    apartment_number: "",
    owner_name: "",
    assigned_by: "",
    completion_notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("form");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedHour, setSelectedHour] = useState(16);
  const [selectedMinute, setSelectedMinute] = useState(50);

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list("first_name")
  });

  useEffect(() => {
    if (open) {
      setActiveTab("form");
      setShowDatePicker(false);
      setSelectedAssignees([]);
      setSelectedHour(16);
      setSelectedMinute(50);
      if (isEdit) {
        setForm(prev => ({
          ...task,
          task_type: task.task_type || "שיחת טלפון",
          priority: task.priority || "בינונית",
          status: task.status || "פתוחה",
          assigned_to: task.assigned_to || "",
          description: task.description || "",
          due_date: task.due_date || "",
          completion_notes: task.completion_notes || ""
        }));
      } else {
        const assignerDisplayName = currentUser?.first_name ?
        `${currentUser.first_name}${currentUser.last_name ? " " + currentUser.last_name : ""}` :
        currentUser?.username || "";
        setForm({
          debtor_record_id: debtorRecord?.id || "",
          apartment_number: debtorRecord?.apartmentNumber || "",
          owner_name: debtorRecord?.ownerName || "",
          task_type: "שיחת טלפון",
          priority: "בינונית",
          status: "פתוחה",
          description: "",
          due_date: "",
          assigned_to: currentUser?.username || "",
          assigned_to_name: assignerDisplayName,
          assigned_by: currentUser?.username || currentUser?.email || "",
          completion_notes: ""
        });
      }
    }
  }, [open, task, debtorRecord, currentUser]);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleAssignedToChange = (username) => {
    const user = appUsers.find((u) => u.username === username);
    const fullName = user ?
    `${user.first_name}${user.last_name ? " " + user.last_name : ""}` :
    username;
    set("assigned_to", username);
    set("assigned_to_name", fullName);
  };

  const toggleAssignee = (username) => {
    setSelectedAssignees(prev =>
      prev.includes(username)
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const generateDates = () => {
    const today = startOfDay(new Date());
    const dates = [];
    for (let i = 0; i < 35; i++) {
      dates.push(addDays(today, i));
    }
    return dates;
  };

  const handleDateSelect = (date) => {
    const timeStr = `T${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}:00`;
    set("due_date", format(date, 'yyyy-MM-dd') + timeStr);
    setShowDatePicker(false);
  };

  const handleTimeChange = () => {
    if (form.due_date) {
      const dateStr = form.due_date.split('T')[0];
      const timeStr = `T${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}:00`;
      set("due_date", dateStr + timeStr);
    }
  };

  const getChangerInfo = () => {
    const fullName = currentUser?.first_name ?
    `${currentUser.first_name}${currentUser.last_name ? " " + currentUser.last_name : ""}` :
    currentUser?.username || "";
    return { username: currentUser?.username || "", name: fullName };
  };

  const handleSave = async () => {
    if (!form.task_type || !form.due_date || !form.description) return;

    // Prevent creating tasks on past dates (only for new tasks)
    if (!isEdit) {
      const selectedDate = new Date(form.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        alert('לא ניתן ליצור משימה בתאריך שעבר');
        return;
      }
    }

    setSaving(true);
    const changer = getChangerInfo();

    if (isEdit) {
      const updateData = { ...form };
      if (form.status === "הושלמה" && !task.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      await base44.entities.Task.update(task.id, updateData);

      // Build changes diff
      const changes = {};
      TRACKED_FIELDS.forEach((field) => {
        const oldVal = task[field] || "";
        const newVal = form[field] || "";
        if (oldVal !== newVal) {
          changes[field] = { from: oldVal, to: newVal };
        }
      });

      await base44.entities.TaskAuditLog.create({
        task_id: task.id,
        action: "updated",
        changed_by_username: changer.username,
        changed_by_name: changer.name,
        changes: JSON.stringify(changes)
      });
    } else {
       const assignees = selectedAssignees.length > 0 ? selectedAssignees : [form.assigned_to];
       for (const assigneeUsername of assignees) {
         const taskData = { ...form, assigned_to: assigneeUsername };
         const newTask = await base44.entities.Task.create(taskData);
         await base44.entities.TaskAuditLog.create({
           task_id: newTask.id,
           action: "created",
           changed_by_username: changer.username,
           changed_by_name: changer.name,
           changes: "{}"
         });
         // שליחת התראה לנמען המשימה
         const user = appUsers.find(u => u.username === assigneeUsername);
         const assigneeName = user ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}` : assigneeUsername;
         await base44.entities.Notification.create({
           user_username: assigneeUsername,
           type: "task_assigned",
           message: `הוקצתה לך משימה: ${form.task_type}${form.owner_name ? ` – דירה ${form.apartment_number}` : ""}`,
           task_id: newTask.id,
           task_type: form.task_type,
           assigner_name: changer.name || changer.username,
           is_read: false
         });
       }
     }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 -mx-6 -mt-6 px-6 py-4 mb-4 rounded-t-lg">
          <DialogTitle className="text-white text-lg font-bold">{isEdit ? "עריכת משימה" : "משימה חדשה"}</DialogTitle>
          {debtorRecord && !isEdit &&
          <p className="text-blue-100 text-sm mt-1">
              דירה {debtorRecord.apartmentNumber} – {debtorRecord.ownerName}
            </p>
          }
        </div>
        <DialogHeader className="sr-only">
          <DialogTitle>{isEdit ? "עריכת משימה" : "משימה חדשה"}</DialogTitle>
        </DialogHeader>

        {isEdit &&
        <div className="flex border-b border-slate-200 mb-2">
            <button
            onClick={() => setActiveTab("form")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "form" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>

              פרטי משימה
            </button>
            <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "audit" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>

              היסטוריית שינויים
            </button>
          </div>
        }

        {activeTab === "audit" && isEdit ?
        <TaskAuditLogTab taskId={task?.id} /> :

        <>
            <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>סוג משימה *</Label>
                  <Select value={form.task_type} onValueChange={(v) => set("task_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 relative">
                   <Label>תאריך ושעה יעד *</Label>
                   <button
                     type="button"
                     onClick={() => setShowDatePicker(!showDatePicker)}
                     className="w-full px-3 py-2 border border-slate-200 rounded-md text-right text-sm bg-white hover:bg-slate-50 transition-colors font-medium"
                   >
                     {form.due_date ? `${format(new Date(form.due_date), 'HH:mm')} ${format(new Date(form.due_date), 'dd-MM-yyyy')}` : 'בחר תאריך ושעה'}
                   </button>
                   {showDatePicker && (
                     <div className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50 w-96">
                       <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
                         <div className="text-center text-sm font-semibold text-blue-600">
                           {form.due_date ? `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')} ${format(new Date(form.due_date), 'dd-MM-yyyy')}` : 'בחר זמן ותאריך'}
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 mb-4">
                         {/* שעות */}
                         <div className="space-y-2">
                           <div className="text-xs font-semibold text-slate-600 text-center">שעה</div>
                           <div className="border border-slate-200 rounded-md h-40 overflow-y-auto space-y-1 p-2">
                             {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                               <button
                                 key={hour}
                                 onClick={() => setSelectedHour(hour)}
                                 className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
                                   selectedHour === hour ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
                                 }`}
                               >
                                 {String(hour).padStart(2, '0')}
                               </button>
                             ))}
                           </div>
                         </div>

                         {/* דקות */}
                         <div className="space-y-2">
                           <div className="text-xs font-semibold text-slate-600 text-center">דקה</div>
                           <div className="border border-slate-200 rounded-md h-40 overflow-y-auto space-y-1 p-2">
                             {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                               <button
                                 key={minute}
                                 onClick={() => setSelectedMinute(minute)}
                                 className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
                                   selectedMinute === minute ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
                                 }`}
                               >
                                 {String(minute).padStart(2, '0')}
                               </button>
                             ))}
                           </div>
                         </div>
                       </div>

                       <div className="space-y-2 mb-3 pb-3 border-b border-slate-200">
                         <div className="text-xs font-semibold text-slate-600">בחר תאריך</div>
                         <div className="grid grid-cols-7 gap-2 mb-2">
                           {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day) => (
                             <div key={day} className="text-center text-xs font-semibold text-slate-600">{day}</div>
                           ))}
                         </div>
                         <div className="grid grid-cols-7 gap-2 max-h-48 overflow-y-auto">
                           {generateDates().map((date, idx) => {
                             const dateStr = format(date, 'yyyy-MM-dd');
                             const formDateStr = form.due_date?.split('T')[0];
                             const isSelected = dateStr === formDateStr;
                             const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                             return (
                               <button
                                 key={idx}
                                 onClick={() => {
                                   set("due_date", `${dateStr}T${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}:00`);
                                 }}
                                 className={`h-7 rounded text-xs font-medium transition-colors ${
                                   isSelected ? 'bg-blue-600 text-white' :
                                   isToday ? 'bg-blue-100 text-blue-700' :
                                   'hover:bg-slate-100'
                                 }`}
                               >
                                 {format(date, 'd')}
                               </button>
                             );
                           })}
                         </div>
                       </div>

                       <button
                         type="button"
                         onClick={() => setShowDatePicker(false)}
                         className="w-full px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                       >
                         אישור
                       </button>
                     </div>
                   )}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label>עדיפות</Label>
                    <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                      <SelectTrigger className={`${
                        form.priority === "גבוהה" ? "bg-red-100 text-red-700 border-red-300" :
                        form.priority === "בינונית" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                        "bg-green-100 text-green-700 border-green-300"
                      } font-semibold`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p}>
                          <span className={`${
                            p === "גבוהה" ? "text-red-700" :
                            p === "בינונית" ? "text-yellow-700" :
                            "text-green-700"
                          } font-semibold`}>● {p}</span>
                        </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>סטטוס</Label>
                    <Select value={form.status} onValueChange={(v) => set("status", v)}>
                      <SelectTrigger className={`${
                        form.status === "פתוחה" ? "bg-blue-100 text-blue-700 border-blue-300" :
                        form.status === "בטיפול" ? "bg-orange-100 text-orange-700 border-orange-300" :
                        form.status === "הושלמה" ? "bg-green-100 text-green-700 border-green-300" :
                        "bg-slate-100 text-slate-700 border-slate-300"
                      } font-semibold`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>
                          <span className={`${
                            s === "פתוחה" ? "text-blue-700" :
                            s === "בטיפול" ? "text-orange-700" :
                            s === "הושלמה" ? "text-green-700" :
                            "text-slate-700"
                          } font-semibold`}>● {s}</span>
                        </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
              </div>

              <div className="space-y-1">
                <Label>הקצה ל:</Label>
                <div className="border border-slate-200 rounded-md p-3 bg-slate-50 max-h-48 overflow-y-auto space-y-2">
                  {appUsers.length === 0 ? (
                    <p className="text-sm text-slate-500">אין משתמשים זמינים</p>
                  ) : (
                    appUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                        <Checkbox
                          checked={selectedAssignees.includes(u.username)}
                          onCheckedChange={() => toggleAssignee(u.username)}
                        />
                        <span className="text-sm">{u.first_name}{u.last_name ? " " + u.last_name : ""}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedAssignees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedAssignees.map((username) => {
                      const user = appUsers.find(u => u.username === username);
                      const name = user ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}` : username;
                      return (
                        <div key={username} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => toggleAssignee(username)}
                            className="hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>תיאור *</Label>
                <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="פרטים נוספים על המשימה..." rows={3} />
              </div>

              {(form.status === "הושלמה" || form.status === "בוטלה") &&
            <div className="space-y-1">
                  <Label>הערות סגירה</Label>
                  <Textarea value={form.completion_notes || ""} onChange={(e) => set("completion_notes", e.target.value)} placeholder="מה בוצע / למה בוטל..." rows={2} />
                </div>
            }
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>ביטול</Button>
              <Button onClick={handleSave} disabled={saving || !form.task_type || !form.due_date || !form.description} className="bg-[#3563d0] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9">
                {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור משימה"}
              </Button>
            </div>
          </>
        }
      </DialogContent>
    </Dialog>);

}