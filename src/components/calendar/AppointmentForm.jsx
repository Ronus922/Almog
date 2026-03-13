import React, { useState, useEffect } from 'react';
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

const COLOR_PALETTE = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

export default function AppointmentForm({ appointment, selectedDate, onSave, onCancel, isLoading }) {
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
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
      setFormData(appointment);
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: format(selectedDate, 'yyyy-MM-dd'),
      }));
    }
    
    // Load users and contacts
    loadUsers();
    loadContacts();
  }, [appointment, selectedDate]);

  const loadUsers = async () => {
    try {
      const usersList = await base44.entities.User.list();
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

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUserToggle = (email) => {
    setFormData(prev => ({
      ...prev,
      attendees_users: prev.attendees_users.includes(email)
        ? prev.attendees_users.filter(u => u !== email)
        : [...prev.attendees_users, email],
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const response = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, response.file_url],
        }));
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {/* Title */}
      <div>
        <Label htmlFor="title">כותרת *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
          placeholder="הכנס כותרת פגישה"
        />
      </div>

      {/* Type */}
      <div>
        <Label>סוג</Label>
        <Select value={formData.appointment_type} onValueChange={(value) => handleChange('appointment_type', value)}>
          <SelectTrigger>
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
          <Label htmlFor="date">תאריך *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="start_time">שעת התחלה *</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => handleChange('start_time', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_time">שעת סיום *</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => handleChange('end_time', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <Label htmlFor="location">מיקום</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="הכנס מיקום"
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
          <Label htmlFor="is_recurring">אירוע חוזר</Label>
        </div>
        {formData.is_recurring && (
          <Select value={formData.recurrence_pattern} onValueChange={(value) => handleChange('recurrence_pattern', value)}>
            <SelectTrigger>
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
        <Label>צבע אירוע</Label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full border-2 ${
                formData.event_color === color ? 'border-slate-900' : 'border-slate-300'
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
          <Label>תזכורת לפני</Label>
          <Select value={formData.reminder_before} onValueChange={(value) => handleChange('reminder_before', value)}>
            <SelectTrigger>
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
          <Label>אופן התזכורת</Label>
          <Select value={formData.reminder_method} onValueChange={(value) => handleChange('reminder_method', value)}>
            <SelectTrigger>
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
        <Label htmlFor="description">תיאור</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="הכנס תיאור האירוע"
          rows={3}
        />
      </div>

      {/* Attendees - Users */}
      {users.length > 0 && (
        <div>
          <Label className="mb-2 block">משתמשים</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded p-3">
            {users.map((user) => (
              <div key={user.email} className="flex items-center gap-2">
                <Checkbox
                  id={`user-${user.email}`}
                  checked={formData.attendees_users.includes(user.email)}
                  onCheckedChange={() => handleUserToggle(user.email)}
                />
                <Label htmlFor={`user-${user.email}`} className="cursor-pointer">
                  {user.full_name} ({user.email})
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendees - Contacts */}
      {contacts.length > 0 && (
        <div>
          <Label className="mb-2 block">אנשי קשר</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 rounded p-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-2">
                <Checkbox
                  id={`contact-${contact.id}`}
                  checked={formData.attendees_contacts.includes(contact.id)}
                  onCheckedChange={() => handleContactToggle(contact.id)}
                />
                <Label htmlFor={`contact-${contact.id}`} className="cursor-pointer">
                  {contact.apartment_number} ({contact.owner_name || contact.tenant_name})
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Attachments */}
      <div>
        <Label htmlFor="attachments">קבצים מצורפים</Label>
        <Input
          id="attachments"
          type="file"
          multiple
          onChange={handleFileUpload}
          className="cursor-pointer"
        />
        {formData.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {formData.attachments.map((url, idx) => (
              <div key={idx} className="text-sm text-blue-600 truncate">
                📎 {url.split('/').pop()}
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
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'שומר...' : appointment ? 'עדכן' : 'צור'}
        </Button>
      </div>
    </form>
  );
}