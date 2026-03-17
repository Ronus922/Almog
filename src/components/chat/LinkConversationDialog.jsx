import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Search, X } from 'lucide-react';

export default function LinkConversationDialog({ isOpen, onClose, onLink, chatMessage }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const allContacts = await base44.entities.Contact.list('-updated_date', 1000);
      setContacts(allContacts || []);
    } catch (error) {
      console.error('שגיאה בטעינת אנשי קשר:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    const ownerName = (contact.owner_name || '').toLowerCase();
    const apartmentNumber = (contact.apartment_number || '').toLowerCase();
    const ownerPhone = (contact.owner_phone || '').toLowerCase();
    
    return ownerName.includes(query) || apartmentNumber.includes(query) || ownerPhone.includes(query);
  });

  const handleLink = async () => {
    if (!selectedContact) return;
    
    try {
      await onLink(selectedContact);
      setSelectedContact(null);
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('שגיאה בשיוך:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-background shadow-lg border p-0 overflow-hidden flex flex-col sm:rounded-lg"
        style={{ maxWidth: '472px', width: '100%' }}
        dir="rtl"
      >
        {/* כפתור X בפינה שמאלית עליונה */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 z-10 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors"
          title="סגור"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* כותרת עליונה עם גרדיאנט */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg">
          <h2 className="text-white text-lg font-bold text-right">שיוך שיחה לגורם קיים</h2>
        </div>

        {/* אזור תוכן */}
        <div className="space-y-4 px-6 pt-5 pb-2 flex-1 overflow-y-auto" dir="rtl">
          {/* שדה פילטר קבוע בראש הרשימה */}
          <div className="sticky top-0 bg-background z-10">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חפש לפי שם..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pr-10 border border-slate-200 rounded-lg text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* רשימת אנשי קשר */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-500 text-sm">טוען אנשי קשר...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {contacts.length === 0 ? 'אין אנשי קשר זמינים' : 'לא נמצאו תוצאות'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => (
                <label
                  key={contact.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedContact?.id === contact.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="contact"
                    value={contact.id}
                    checked={selectedContact?.id === contact.id}
                    onChange={() => setSelectedContact(contact)}
                    className="w-4 h-4 flex-shrink-0 accent-blue-600"
                  />
                  <div className="flex-1 text-right min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{contact.owner_name || '—'}</p>
                    {contact.apartment_number && (
                      <p className="text-xs text-blue-600 font-medium mt-0.5">דירה {contact.apartment_number}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* footer תחתון */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button 
            onClick={onClose}
            variant="outline"
            className="h-9"
          >
            ביטול
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedContact}
            className="h-9 bg-[#3563d0] text-white hover:bg-[#2852b5] px-4"
          >
            שמור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}