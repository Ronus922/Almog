import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Upload, X, Search } from 'lucide-react';

const COLOR_PALETTE = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

export default function AppointmentForm({ appointment, selectedDate, onSave, onCancel, isLoading }) {
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [contactSearchTerm, setContactSearchTerm] = useState('');

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

    loadUsers();
    loadContacts();
  }, []);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const formatUserLabel = useCallback((user) => 
    user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
    []
  );

  const formatContactLabel = useCallback((contact) =>
    `דירה ${contact.apartment_number} - ${contact.owner_name || contact.tenant_name}`,
    []
  );

  const handleUserToggle = useCallback((userId) => {
    setFormData(prev => ({
      ...prev,
      attendees_users: prev.attendees_users.includes(userId)
        ? prev.attendees_users.filter(u => u !== userId)
        : [...prev.attendees_users, userId],
    }));
  }, []);

  const handleContactToggle = useCallback((contactId) => {
    setFormData(prev => ({
      ...prev,
      attendees_contacts: prev.attendees_contacts.includes(contactId)
        ? prev.attendees_contacts.filter(c => c !== contactId)
        : [...prev.attendees_contacts, contactId],
    }));
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await uploadFile(file);
    }
  }, []);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      await uploadFile(file);
    }
  }, []);

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

  const removeAttachment = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    await onSave(formData);
  }, [formData, onSave]);

  // Filter users and contacts
  const filteredUsers = userSearchTerm.trim() === '' 
    ? users 
    : users.filter(u => {
        const label = formatUserLabel(u).toLowerCase();
        return label.includes(userSearchTerm.toLowerCase());
      });

  const filteredContacts = contactSearchTerm.trim() === '' 
    ? contacts 
    : contacts.filter(c => {
        const label = formatContactLabel(c).toLowerCase();
        return label.includes(contactSearchTerm.toLowerCase());
      });

  return (
    <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
      {/* Title */}
      <div>
        <Label htmlFor="title" className="block mb-2 font-bold text-slate-900 text-sm">כותרת *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
          placeholder="הכנס כותרת פגישה"
          dir="rtl"
          className="h-10"
        />
      </div>

      {/* Type and Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block mb-2 font-bold text-slate-900 text-sm">סוג</Label>
          <select 
            value={formData.appointment_type} 
            onChange={(e) => handleChange('appointment_type', e.target.value)}
            dir="rtl"
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-right bg-white text-slate-900 font-medium"
          >
            <option value="פגישה">פגישה</option>
            <option value="משימה">משימה</option>
            <option value="אחר">אחר</option>
          </select>
        </div>
        <div>
          <Label htmlFor="location" className="block mb-2 font-bold text-slate-900 text-sm">מיקום</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="הכנס מיקום"
            dir="rtl"
            className="h-10"
          />
        </div>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date" className="block mb-2 font-bold text-slate-900 text-sm">תאריך *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
            dir="rtl"
            className="h-10"
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        <div>
          <Label htmlFor="start_time" className="block mb-2 font-bold text-slate-900 text-sm">שעת התחלה *</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => handleChange('start_time', e.target.value)}
            required
            dir="rtl"
            className="h-10"
          />
        </div>
        <div>
          <Label htmlFor="end_time" className="block mb-2 font-bold text-slate-900 text-sm">שעת סיום *</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => handleChange('end_time', e.target.value)}
            required
            dir="rtl"
            className="h-10"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="block mb-2 font-bold text-slate-900 text-sm">תיאור</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="הכנס תיאור האירוע"
          rows={3}
          dir="rtl"
          className="resize-none"
        />
      </div>

      {/* Recurring */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <Checkbox
            id="is_recurring"
            checked={formData.is_recurring}
            onCheckedChange={(checked) => handleChange('is_recurring', checked)}
          />
          <Label htmlFor="is_recurring" className="cursor-pointer font-bold text-slate-900 text-sm">אירוע חוזר</Label>
        </div>
        {formData.is_recurring && (
          <select 
            value={formData.recurrence_pattern} 
            onChange={(e) => handleChange('recurrence_pattern', e.target.value)}
            dir="rtl"
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-right bg-white text-slate-900"
          >
            <option value="weekly">שבועי</option>
            <option value="monthly">חודשי</option>
            <option value="yearly">שנתי</option>
          </select>
        )}
      </div>

      {/* Event Color */}
      <div>
        <Label className="block mb-3 font-bold text-slate-900 text-sm">צבע אירוע</Label>
        <div className="flex gap-2 flex-wrap justify-end">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${
                formData.event_color === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-slate-300'
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
          <Label className="block mb-2 font-bold text-slate-900 text-sm">תזכורת לפני</Label>
          <select 
            value={formData.reminder_before} 
            onChange={(e) => handleChange('reminder_before', e.target.value)}
            dir="rtl"
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-right bg-white text-slate-900 font-medium"
          >
            <option value="15m">15 דקות</option>
            <option value="30m">30 דקות</option>
            <option value="1h">שעה אחת</option>
            <option value="1d">יום אחד</option>
          </select>
        </div>
        <div>
          <Label className="block mb-2 font-bold text-slate-900 text-sm">אופן התזכורת</Label>
          <select 
            value={formData.reminder_method} 
            onChange={(e) => handleChange('reminder_method', e.target.value)}
            dir="rtl"
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-right bg-white text-slate-900 font-medium"
          >
            <option value="email">אימייל</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="none">ללא</option>
          </select>
        </div>
      </div>

      {/* Users - Multi Select */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <Label className="block mb-3 font-bold text-slate-900 text-sm">משתמשים</Label>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="חפש משתמש..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            onFocus={() => setShowUserSearch(true)}
            dir="rtl"
            className="pl-10 h-9 text-sm"
          />
        </div>

        {showUserSearch && (
          <div className="bg-white rounded-lg border border-slate-200 max-h-40 overflow-y-auto mb-3 p-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer" dir="rtl">
                  <Checkbox
                    checked={formData.attendees_users.includes(user.id)}
                    onCheckedChange={() => {
                      handleUserToggle(user.id);
                    }}
                  />
                  <span className="text-sm text-slate-700 flex-1">{formatUserLabel(user)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-2">לא נמצאו משתמשים</p>
            )}
          </div>
        )}

        {/* Selected Users */}
        {formData.attendees_users.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.attendees_users.map((userId) => {
              const user = users.find(u => u.id === userId);
              return user ? (
                <div key={userId} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <span>{formatUserLabel(user)}</span>
                  <button
                    type="button"
                    onClick={() => handleUserToggle(userId)}
                    className="hover:text-blue-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Contacts - Multi Select */}
      {contacts.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <Label className="block mb-3 font-bold text-slate-900 text-sm">אנשי קשר</Label>
          <div className="relative mb-3">
            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="חפש לפי שם או דירה..."
              value={contactSearchTerm}
              onChange={(e) => setContactSearchTerm(e.target.value)}
              onFocus={() => setShowContactSearch(true)}
              dir="rtl"
              className="pl-10 h-9 text-sm"
            />
          </div>

          {showContactSearch && (
            <div className="bg-white rounded-lg border border-slate-200 max-h-40 overflow-y-auto mb-3 p-2">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer" dir="rtl">
                    <Checkbox
                      checked={formData.attendees_contacts.includes(contact.id)}
                      onCheckedChange={() => {
                        handleContactToggle(contact.id);
                      }}
                    />
                    <span className="text-sm text-slate-700 flex-1">{formatContactLabel(contact)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">לא נמצאו אנשי קשר</p>
              )}
            </div>
          )}

          {/* Selected Contacts */}
          {formData.attendees_contacts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.attendees_contacts.map((contactId) => {
                const contact = contacts.find(c => c.id === contactId);
                return contact ? (
                  <div key={contactId} className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                    <span>{formatContactLabel(contact)}</span>
                    <button
                      type="button"
                      onClick={() => handleContactToggle(contactId)}
                      className="hover:text-amber-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}

      {/* File Upload - Drag & Drop */}
      <div>
        <Label className="block mb-3 font-bold text-slate-900 text-sm">קבצים מצורפים</Label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
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
            <Upload className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">גרור קבצים לכאן או לחץ לבחירה</p>
            <p className="text-xs text-slate-500 mt-1">תמך בכל סוגי הקבצים</p>
          </label>
        </div>

        {/* Attachments List */}
        {formData.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-bold text-slate-700">קבצים מועלים:</p>
            {formData.attachments.map((url, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-100 p-3 rounded-lg text-sm border border-slate-200" dir="rtl">
                <div className="flex items-center gap-2 flex-1">
                  <span>📎</span>
                  <span className="text-slate-700 truncate flex-1">{url.split('/').pop()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-red-600 hover:text-red-800 text-xs font-semibold"
                >
                  הסר
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-6 border-t border-slate-200 mt-8">
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-6">
          ביטול
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6">
          {isLoading ? 'שומר...' : appointment ? 'עדכן' : 'צור'}
        </Button>
      </div>
    </form>
  );
}