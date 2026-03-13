import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Upload } from 'lucide-react';
import MultiSelectAttendees from './MultiSelectAttendees';

const COLOR_PALETTE = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

export default function AppointmentForm({ appointment, selectedDate, onSave, onCancel, isLoading }) {
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    appointment_type: 'פגישה',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    start_time: '10:00',
    end_time: '11:00',
    location: '',
    description: '',
    reminder_before: '15m',
    reminder_method: 'email',
    event_color: '#3B82F6',
    is_recurring: false,
    recurrence_pattern: 'weekly',
    attendees_users: [],
    attendees_contacts: [],
    attachments: [],
  });

  useEffect(() => {
    if (appointment) {
      setFormData(prev => ({
        ...prev,
        title: appointment.title || '',
        appointment_type: appointment.appointment_type || 'פגישה',
        date: appointment.date || '',
        start_time: appointment.start_time || '10:00',
        end_time: appointment.end_time || '11:00',
        location: appointment.location || '',
        description: appointment.description || '',
        reminder_before: appointment.reminder_before || '15m',
        reminder_method: appointment.reminder_method || 'email',
        event_color: appointment.event_color || '#3B82F6',
        is_recurring: appointment.is_recurring || false,
        recurrence_pattern: appointment.recurrence_pattern || 'weekly',
        attendees_users: appointment.attendees_users || [],
        attendees_contacts: appointment.attendees_contacts || [],
        attachments: appointment.attachments || [],
      }));
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: format(selectedDate, 'yyyy-MM-dd'),
      }));
    }
  }, [appointment, selectedDate]);

  useEffect(() => {
    loadUsers();
    loadContacts();
  }, []);

  const loadUsers = async () => {
    try {
      const usersList = await base44.entities.AppUser.list();
      setUsers(usersList);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const contactsList = await base44.entities.Contact.list();
      setContacts(contactsList);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const getUserAvatarColor = useCallback((user) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
    const index = users.findIndex(u => u.id === user.id);
    return colors[(index >= 0 ? index : 0) % colors.length];
  }, [users]);

  const getContactAvatarColor = useCallback((contact) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
    const index = contacts.findIndex(c => c.id === contact.id);
    return colors[(index >= 0 ? index : 0) % colors.length];
  }, [contacts]);

  const formatUserLabel = useCallback((user) => 
    user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
    []
  );

  const formatContactLabel = useCallback((contact) =>
    `דירה ${contact.apartment_number} - ${contact.owner_name || contact.tenant_name}`,
    []
  );

  const handleUserToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      attendees_users: prev.attendees_users.includes(userId)
        ? prev.attendees_users.filter(u => u !== userId)
        : [...prev.attendees_users, userId],
    }));
  };

  const handleContactToggle = (contactId) => {
    setFormData(prev => ({
      ...prev,
      attendees_contacts: prev.attendees_contacts.includes(contactId)
        ? prev.attendees_contacts.filter(c => c !== contactId)
        : [...prev.attendees_contacts, contactId],
    }));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await uploadFile(file);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, response.file_url],
      }));
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6" dir="rtl">
      {/* Title */}
      <div>
        <Label htmlFor="title" className="text-right block">כותרת *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
          placeholder="הכנס כותרת פגישה"
          dir="rtl"
        />
      </div>

      {/* Type */}
      <div>
        <Label className="text-right block">סוג</Label>
        <Select value={formData.appointment_type} onValueChange={(value) => handleChange('appointment_type', value)}>
          <SelectTrigger dir="rtl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="פגישה">פגישה</SelectItem>
            <SelectItem value="משימה">משימה</SelectItem>
            <SelectItem value="אחר">אחר</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date" className="text-right block">תאריך *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
            dir="rtl"
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        <div>
          <Label htmlFor="start_time" className="text-right block">שעת התחלה *</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => handleChange('start_time', e.target.value)}
            required
            dir="rtl"
          />
        </div>
        <div>
          <Label htmlFor="end_time" className="text-right block">שעת סיום *</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => handleChange('end_time', e.target.value)}
            required
            dir="rtl"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <Label htmlFor="location" className="text-right block">מיקום</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="הכנס מיקום"
          dir="rtl"
        />
      </div>

      {/* Recurring */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Checkbox
            id="is_recurring"
            checked={formData.is_recurring}
            onCheckedChange={(checked) => handleChange('is_recurring', checked)}
          />
          <Label htmlFor="is_recurring" className="cursor-pointer">אירוע חוזר</Label>
        </div>
        {formData.is_recurring && (
          <Select value={formData.recurrence_pattern} onValueChange={(value) => handleChange('recurrence_pattern', value)}>
            <SelectTrigger dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">שבועי</SelectItem>
              <SelectItem value="monthly">חודשי</SelectItem>
              <SelectItem value="yearly">שנתי</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Event Color */}
      <div>
        <Label className="text-right block mb-2">צבע אירוע</Label>
        <div className="flex gap-2 flex-wrap justify-end">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                formData.event_color === color ? 'border-slate-900 scale-110' : 'border-slate-300'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleChange('event_color', color)}
            />
          ))}
        </div>
      </div>

      {/* Reminder */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-right block">תזכורת לפני</Label>
          <Select value={formData.reminder_before} onValueChange={(value) => handleChange('reminder_before', value)}>
            <SelectTrigger dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 דקות</SelectItem>
              <SelectItem value="30m">30 דקות</SelectItem>
              <SelectItem value="1h">שעה אחת</SelectItem>
              <SelectItem value="1d">יום אחד</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-right block">אופן התזכורת</Label>
          <Select value={formData.reminder_method} onValueChange={(value) => handleChange('reminder_method', value)}>
            <SelectTrigger dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">אימייל</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="none">ללא</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-right block">תיאור</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="הכנס תיאור האירוע"
          rows={3}
          dir="rtl"
        />
      </div>

      {/* Attendees - Users */}
      <MultiSelectAttendees
        label="משתמשים"
        items={users}
        selectedIds={formData.attendees_users}
        onToggle={handleUserToggle}
        searchPlaceholder="חפש משתמש..."
        formatLabel={(user) => user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
        getAvatarColor={getUserAvatarColor}
      />

      {/* Attendees - Contacts */}
      {contacts.length > 0 && (
        <MultiSelectAttendees
          label="אנשי קשר"
          items={contacts}
          selectedIds={formData.attendees_contacts}
          onToggle={handleContactToggle}
          searchPlaceholder="חפש לפי שם או דירה..."
          formatLabel={(contact) => `דירה ${contact.apartment_number} - ${contact.owner_name || contact.tenant_name}`}
          getAvatarColor={getContactAvatarColor}
        />
      )}

      {/* File Upload - Drag & Drop */}
      <div>
        <Label className="text-right block mb-2">קבצים מצורפים</Label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-25'
          }`}
        >
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer block">
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <p className="text-sm font-medium text-slate-700">גרור קבצים לכאן או לחץ לבחירה</p>
            <p className="text-xs text-slate-500 mt-1">תמך בכל סוגי הקבצים</p>
          </label>
        </div>

        {/* Attachments List */}
        {formData.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-slate-700 text-right">קבצים מועלים:</p>
            {formData.attachments.map((url, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-100 p-2 rounded text-sm">
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  הסר
                </button>
                <span className="text-slate-700 truncate">{url.split('/').pop()}</span>
                <span>📎</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
          {isLoading ? 'שומר...' : appointment ? 'עדכן' : 'צור'}
        </Button>
      </div>
    </form>
  );
}