import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Search, ChevronDown } from "lucide-react";
import TaskAuditLogTab from "@/components/tasks/TaskAuditLogTab";
import TaskAttachmentsTab from "@/components/tasks/TaskAttachmentsTab";

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
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const userDropdownRef = useRef(null);

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list("first_name")
  });

  const filteredUsers = userSearchTerm.trim() === ""
    ? appUsers
    : appUsers.filter(u => {
        const label = `${u.first_name}${u.last_name ? " " + u.last_name : ""}`.toLowerCase();
        return label.includes(userSearchTerm.toLowerCase());
      });

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowUserDropdown(false);
      }
    };
    
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setActiveTab("form");
      setShowUserDropdown(false);
      setUserSearchTerm("");
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
        const displayName = currentUser?.email === "r@bios.co.il" ? "רונן משולם" : assignerDisplayName;
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
          assigned_to_name: displayName,
          assigned_by: currentUser?.username || currentUser?.email || "",
          completion_notes: ""
        });
      }
    }
  }, [open, task, debtorRecord, currentUser]);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleAssignedToChange = (username) => {
    const user = appUsers.find((u) => u.username === username);
    let fullName = user ?
    `${user.first_name}${user.last_name ? " " + user.last_name : ""}` :
    username;
    if (user?.email === "r@bios.co.il") {
      fullName = "רונן משולם";
    }
    set("assigned_to", username);
    set("assigned_to_name", fullName);
  };

  const getChangerInfo = () => {
    const fullName = currentUser?.first_name ?
    `${currentUser.first_name}${currentUser.last_name ? " " + currentUser.last_name : ""}` :
    currentUser?.username || "";
    return { username: currentUser?.username || "", name: fullName };
  };

  const handleSave = async () => {
    if (!form.task_type || !form.due_date || !form.description) return;

    // אם לא הוקצה למשתמש אחר, הקצה לעצמך
    let finalForm = { ...form };
    if (!form.assigned_to || form.assigned_to === "") {
      const assignerDisplayName = currentUser?.first_name ?
        `${currentUser.first_name}${currentUser.last_name ? " " + currentUser.last_name : ""}` :
        currentUser?.username || "";
      const displayName = currentUser?.email === "r@bios.co.il" ? "רונן משולם" : assignerDisplayName;
      finalForm = {
        ...finalForm,
        assigned_to: currentUser?.username || "",
        assigned_to_name: displayName
      };
    }

    // Prevent creating tasks on past dates (only for new tasks)
    if (!isEdit) {
      const selectedDate = new Date(finalForm.due_date);
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
      const updateData = { ...finalForm };
      if (finalForm.status === "הושלמה" && !task.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      await base44.entities.Task.update(task.id, updateData);

      // Build changes diff
      const changes = {};
      TRACKED_FIELDS.forEach((field) => {
        const oldVal = task[field] || "";
        const newVal = finalForm[field] || "";
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
      const newTask = await base44.entities.Task.create(finalForm);
      await base44.entities.TaskAuditLog.create({
        task_id: newTask.id,
        action: "created",
        changed_by_username: changer.username,
        changed_by_name: changer.name,
        changes: "{}"
      });
      // שליחת התראה לנמען המשימה
      if (finalForm.assigned_to) {
        await base44.entities.Notification.create({
          user_username: finalForm.assigned_to,
          type: "task_assigned",
          message: `הוקצתה לך משימה: ${finalForm.task_type}${finalForm.owner_name ? ` – דירה ${finalForm.apartment_number}` : ""}`,
          task_id: newTask.id,
          task_type: finalForm.task_type,
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
      <DialogContent className="max-w-lg p-0 overflow-hidden" dir="rtl">
         <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg">
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
        <div className="flex border-b border-slate-200 mb-2 px-6 pt-4">
            <button
            onClick={() => setActiveTab("form")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "form" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
              פרטי משימה
            </button>
            <button
            onClick={() => setActiveTab("attachments")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "attachments" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
              קבצים מצורפים
            </button>
            <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "audit" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
              היסטוריית שינויים
            </button>
          </div>
        }

        {activeTab === "audit" && isEdit ? (
        <TaskAuditLogTab taskId={task?.id} />
        ) : activeTab === "attachments" && isEdit ? (
        <TaskAttachmentsTab
          taskId={task?.id}
          currentUser={currentUser}
          canEdit={
            currentUser?.role === "SUPER_ADMIN" ||
            task?.assigned_by === currentUser?.username ||
            task?.assigned_to === currentUser?.username
          }
        />
        ) : (
        <>
            <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto px-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">סוג משימה *</Label>
                  <Select value={form.task_type} onValueChange={(v) => set("task_type", v)}>
                    <SelectTrigger className="h-10 border-slate-200"><SelectValue placeholder="בחר סוג..." /></SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                   <Label className="text-sm font-semibold text-slate-700">תאריך יעד *</Label>
                   <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
                     <PopoverTrigger asChild>
                       <Button variant="outline" className="w-full justify-start text-left font-normal h-10 bg-white hover:bg-slate-50 border-slate-200">
                         {form.due_date ? format(new Date(form.due_date + "T00:00:00"), "dd MMMM yyyy", { locale: he }) : "בחר תאריך"}
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                       <Calendar
                         mode="single"
                         selected={form.due_date ? new Date(form.due_date + "T00:00:00") : undefined}
                         onSelect={(date) => {
                           if (date) {
                             set("due_date", format(date, "yyyy-MM-dd"));
                             setOpenDatePicker(false);
                           }
                         }}
                         disabled={(date) => {
                           if (isEdit) return false;
                           return date < new Date(new Date().setHours(0, 0, 0, 0));
                         }}
                         locale={he}
                         className="text-lg"
                       />
                     </PopoverContent>
                   </Popover>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">עדיפות</Label>
                    <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                      <SelectTrigger className={`h-10 ${
                        form.priority === "גבוהה" ? "bg-red-100 text-red-700 border-red-300" :
                        form.priority === "בינונית" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                        "bg-green-100 text-green-700 border-green-300"
                      } font-semibold`}><SelectValue placeholder="בחר..." /></SelectTrigger>
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
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">סטטוס</Label>
                    <Select value={form.status} onValueChange={(v) => set("status", v)}>
                      <SelectTrigger className={`h-10 ${
                        form.status === "פתוחה" ? "bg-blue-100 text-blue-700 border-blue-300" :
                        form.status === "בטיפול" ? "bg-orange-100 text-orange-700 border-orange-300" :
                        form.status === "הושלמה" ? "bg-green-100 text-green-700 border-green-300" :
                        "bg-slate-100 text-slate-700 border-slate-300"
                      } font-semibold`}><SelectValue placeholder="בחר..." /></SelectTrigger>
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

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">הקצה ל:</Label>
                <div className="relative" ref={userDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 flex items-center justify-between hover:border-slate-300 bg-white text-right transition-all"
                  >
                    <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                    <span className="text-sm text-slate-700 flex-1 text-right">
                      {form.assigned_to_name || "בחר משתמש..."}
                    </span>
                  </button>

                  {showUserDropdown && (
                    <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-slate-200">
                        <div className="relative">
                          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                          <Input
                            type="text"
                            placeholder="חפש משתמש..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            dir="rtl"
                            className="pl-10 h-9 text-sm"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto p-2">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <div 
                              key={user.id} 
                              className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors" 
                              dir="rtl"
                              onClick={() => {
                                handleAssignedToChange(user.username);
                                setShowUserDropdown(false);
                                setUserSearchTerm("");
                              }}
                            >
                              <Checkbox
                                checked={form.assigned_to === user.username}
                              />
                              <span className="text-sm text-slate-700">{user.first_name}{user.last_name ? " " + user.last_name : ""}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-3">לא נמצאו משתמשים</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">תיאור *</Label>
                <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="פרטים נוספים על המשימה..." rows={4} className="border-slate-200 rounded-lg resize-none" />
              </div>

              {(form.status === "הושלמה" || form.status === "בוטלה") &&
              <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">הערות סגירה</Label>
                  <Textarea value={form.completion_notes || ""} onChange={(e) => set("completion_notes", e.target.value)} placeholder="מה בוצע / למה בוטל..." rows={3} className="border-slate-200 rounded-lg resize-none" />
                </div>
              }
            </div>

            <div className="flex justify-end gap-2 mt-4 px-6 pb-4">
              <Button variant="outline" onClick={onClose}>ביטול</Button>
              <Button onClick={handleSave} disabled={saving || !form.task_type || !form.due_date || !form.description} className="bg-[#3563d0] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9">
                {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור משימה"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>);

}