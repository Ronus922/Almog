import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Upload, X, Search, ChevronDown } from 'lucide-react';
import DateTimePicker from '@/components/ui/DateTimePicker';

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
  const userDropdownRef = useRef(null);
  const contactDropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    appointment_type: 'פגישה',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    start_time: '10:00',
    end_time: '11:00',
    location: '',
    description: '',
    reminder_before: '15m',
    reminder_method: 'none',
    event_color: '#3B82F6',
    is_recurring: false,
    recurrence_pattern: '',
    attendees_users: [],
    attendees_contacts: [],
    attachments: [],
  });



  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowUserSearch(false);
        setShowContactSearch(false);
      }
    };
    
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserSearch(false);
      }
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(e.target)) {
        setShowContactSearch(false);
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
        reminder_method: appointment.reminder_method || 'none',
        event_color: appointment.event_color || '#3B82F6',
        is_recurring: appointment.is_recurring || false,
        recurrence_pattern: appointment.recurrence_pattern || '',
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
    
    // Validate recurring appointments
    if (formData.is_recurring) {
      if (!formData.recurrence_pattern) {
        alert('אנא בחר תדירות חזרה');
        return;
      }
      if (!formData.recurrence_count || formData.recurrence_count < 1) {
        alert('אנא הזן מספר חזרות חוקי (לפחות 1)');
        return;
      }
    }
    
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
            className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-right bg-white text-slate-900 font-medium"
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block mb-2 font-bold text-slate-900 text-sm">תאריך ושעת התחלה *</Label>
          <DateTimePicker
            value={formData.date && formData.start_time ? new Date(`${formData.date}T${formData.start_time}`) : null}
            onChange={(dt) => {
              if (dt) {
                handleChange('date', format(dt, 'yyyy-MM-dd'));
                handleChange('start_time', format(dt, 'HH:mm'));
              }
            }}
            placeholder="בחר תאריך ושעת התחלה"
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
        <div className="flex items-center gap-3 mb-4">
          <Checkbox
            id="is_recurring"
            checked={formData.is_recurring}
            onCheckedChange={(checked) => handleChange('is_recurring', checked)}
          />
          <Label htmlFor="is_recurring" className="cursor-pointer font-bold text-slate-900 text-sm">אירוע חוזר</Label>
        </div>
        {formData.is_recurring && (
          <div className="space-y-4">
            {/* Pattern Selection */}
            <div>
              <Label className="block mb-2 font-bold text-slate-900 text-sm">תדירות חזרה *</Label>
              <select 
                value={formData.recurrence_pattern} 
                onChange={(e) => handleChange('recurrence_pattern', e.target.value)}
                dir="rtl"
                className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-right bg-white text-slate-900 font-medium"
              >
                <option value="">בחר תדירות</option>
                <option value="יומי">יומי</option>
                <option value="שבועי">שבועי</option>
                <option value="חודשי">חודשי</option>
                <option value="שנתי">שנתי</option>
              </select>
            </div>

            {/* Interval & Count Selection - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interval Selection */}
              <div>
                <Label htmlFor="recurrence_interval" className="block mb-2 font-bold text-slate-900 text-sm">כל כמה יחידות *</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="recurrence_interval"
                    type="number"
                    min="1"
                    value={formData.recurrence_interval || 1}
                    onChange={(e) => handleChange('recurrence_interval', Math.max(1, parseInt(e.target.value) || 1))}
                    dir="rtl"
                    className="w-20 h-10 border border-slate-200 rounded-lg px-3 text-center bg-white text-slate-900 font-medium"
                  />
                  {formData.recurrence_pattern && (
                    <span className="text-slate-700 font-medium text-sm">
                      {formData.recurrence_pattern === 'יומי' ? 'ימים' : 
                       formData.recurrence_pattern === 'שבועי' ? 'שבועות' :
                       formData.recurrence_pattern === 'חודשי' ? 'חודשים' :
                       'שנים'}
                    </span>
                  )}
                </div>
              </div>

              {/* Recurrence Count */}
              <div>
                <Label htmlFor="recurrence_count" className="block mb-2 font-bold text-slate-900 text-sm">מספר חזרות *</Label>
                <input
                  id="recurrence_count"
                  type="number"
                  min="1"
                  value={formData.recurrence_count || ''}
                  onChange={(e) => handleChange('recurrence_count', Math.max(1, parseInt(e.target.value) || 0))}
                  placeholder="מספר החזרות הכולל"
                  dir="rtl"
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-right bg-white text-slate-900 font-medium placeholder-slate-400"
                />
              </div>
            </div>
            {formData.recurrence_count && <p className="text-xs text-slate-500 mt-1.5">לדוגמה: 6 חזרות</p>}

            {/* Preview */}
            {formData.recurrence_pattern && formData.recurrence_count && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mt-3">
                <p className="text-sm text-blue-900 font-medium text-right">
                  האירוע ייווצר {formData.recurrence_count} פעמים,{' '}
                  {formData.recurrence_interval > 1 ? `כל ${formData.recurrence_interval} ` : 'כל '}
                  {formData.recurrence_pattern === 'יומי' ? 'ימים' : 
                   formData.recurrence_pattern === 'שבועי' ? 'שבועות' :
                   formData.recurrence_pattern === 'חודשי' ? 'חודשים' :
                   'שנים'}
                </p>
              </div>
            )}
          </div>
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
            className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-right bg-white text-slate-900 font-medium"
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
            className="w-full h-10 border border-slate-200 rounded-lg px-3 py-2 text-right bg-white text-slate-900 font-medium"
          >
            <option value="email">אימייל</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="none">ללא</option>
          </select>
        </div>
      </div>

      {/* Users - Multi Select */}
      <div>
        <Label className="block mb-3 font-bold text-slate-900 text-sm">משתמשים</Label>
        <div className="relative" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => setShowUserSearch(!showUserSearch)}
            className="w-full h-10 border border-slate-200 rounded-lg px-3 flex items-center justify-between hover:border-slate-300 bg-white text-right transition-all"
          >
            <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${showUserSearch ? 'rotate-180' : ''}`} />
            <span className="text-sm text-slate-700 flex-1 text-right">
              {formData.attendees_users.length > 0 
                ? `${formData.attendees_users.length} משתמשים נבחרו`
                : 'בחר משתמשים...'}
            </span>
          </button>

          {showUserSearch && (
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
                    >
                      <Checkbox
                        checked={formData.attendees_users.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <span className="text-sm text-slate-700">{formatUserLabel(user)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-3">לא נמצאו משתמשים</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Users Tags */}
        {formData.attendees_users.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 justify-end">
            {formData.attendees_users.map((userId) => {
              const user = users.find(u => u.id === userId);
              return user ? (
                <div key={userId} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200">
                  <span>{formatUserLabel(user)}</span>
                  <button
                    type="button"
                    onClick={() => handleUserToggle(userId)}
                    className="text-slate-500 hover:text-slate-700"
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
        <div>
          <Label className="block mb-3 font-bold text-slate-900 text-sm">אנשי קשר</Label>
          <div className="relative" ref={contactDropdownRef}>
            <button
              type="button"
              onClick={() => setShowContactSearch(!showContactSearch)}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 flex items-center justify-between hover:border-slate-300 bg-white text-right transition-all"
            >
              <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${showContactSearch ? 'rotate-180' : ''}`} />
              <span className="text-sm text-slate-700 flex-1 text-right">
                {formData.attendees_contacts.length > 0 
                  ? `${formData.attendees_contacts.length} אנשי קשר נבחרו`
                  : 'בחר אנשי קשר...'}
              </span>
            </button>

            {showContactSearch && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-slate-200">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="חפש לפי שם או דירה..."
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                      dir="rtl"
                      className="pl-10 h-9 text-sm"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto p-2">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                      <div 
                        key={contact.id} 
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors" 
                        dir="rtl"
                      >
                        <Checkbox
                          checked={formData.attendees_contacts.includes(contact.id)}
                          onCheckedChange={() => handleContactToggle(contact.id)}
                        />
                        <span className="text-sm text-slate-700">{formatContactLabel(contact)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-3">לא נמצאו אנשי קשר</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected Contacts Tags */}
          {formData.attendees_contacts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 justify-end">
              {formData.attendees_contacts.map((contactId) => {
                const contact = contacts.find(c => c.id === contactId);
                return contact ? (
                  <div key={contactId} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200">
                    <span>{formatContactLabel(contact)}</span>
                    <button
                      type="button"
                      onClick={() => handleContactToggle(contactId)}
                      className="text-slate-500 hover:text-slate-700"
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