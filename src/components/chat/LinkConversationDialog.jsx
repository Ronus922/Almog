import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Search, AlertCircle, X } from 'lucide-react';

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
      <DialogContent className="max-w-2xl p-0" dir="rtl">
        {/* כותרת */}
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">שיוך שיחה לגורם קיים</h2>
          <p className="text-sm text-slate-600 mt-1">
            בחר את הגורם לשיוך השיחה ממספר הטלפון {chatMessage?.contact_phone || ''}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* תיבת אזהרה */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              שחקן הוא אפליקציונלי. יש להשתחזר את השיחה כלא בתוך נרום חדשות לאחרון רק לאחר "תיקון" על "שינוי".
            </p>
          </div>

          {/* שורת חיפוש */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">הודעות מממספר</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, דירה או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pr-10 border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* רשימת אנשי קשר עם radio buttons */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="p-6 text-center text-slate-500">טוען אנשי קשר...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                {contacts.length === 0 ? 'אין אנשי קשר זמינים' : 'לא נמצאו תוצאות'}
              </div>
            ) : (
              filteredContacts.map((contact, index) => (
                <label
                  key={contact.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="contact"
                    value={contact.id}
                    checked={selectedContact?.id === contact.id}
                    onChange={() => setSelectedContact(contact)}
                    className="mt-2 flex-shrink-0 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{contact.owner_name || '—'}</p>
                    <div className="flex gap-2 mt-0.5 text-xs text-slate-600">
                      {contact.apartment_number && (
                        <span className="text-blue-600 font-medium">דירה {contact.apartment_number}</span>
                      )}
                      {contact.owner_phone && (
                        <span className="text-blue-600">{contact.owner_phone}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* כפתורים */}
          <div className="flex justify-between gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={onClose}
              className="gap-2 text-slate-600 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
              חזרה לא משוכך
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedContact}
              className="px-6 h-9 bg-blue-500 hover:bg-blue-600 text-white gap-2"
            >
              <span>בחזור נרומה לשחור</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}