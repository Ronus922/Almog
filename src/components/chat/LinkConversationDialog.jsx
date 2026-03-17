import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Search, Link2 } from 'lucide-react';

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
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 px-6 py-6 text-white rounded-t-lg">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="w-6 h-6" />
            שיוך שיחה לגורם קיים
          </h2>
          <p className="text-sm text-blue-100 mt-1">בחר אנשי קשר להשיוך את השיחה</p>
        </div>

        <div className="p-6 space-y-4">
          {/* שורת חיפוש */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש לפי שם, דירה או טלפון..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pr-10 border-slate-200 rounded-lg"
            />
          </div>

          {/* רשימת אנשי קשר */}
          <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-slate-500">טוען אנשי קשר...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                {contacts.length === 0 ? 'אין אנשי קשר זמינים' : 'לא נמצאו תוצאות'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-4 text-right transition-colors ${
                      selectedContact?.id === contact.id
                        ? 'bg-blue-50 border-r-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{contact.owner_name || '—'}</p>
                        <div className="flex gap-3 mt-1 text-xs text-slate-500">
                          {contact.apartment_number && (
                            <span>דירה {contact.apartment_number}</span>
                          )}
                          {contact.owner_phone && (
                            <span>{contact.owner_phone}</span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedContact?.id === contact.id
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedContact?.id === contact.id && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* כפתורים */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 h-9"
            >
              ביטול
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedContact}
              className="px-6 h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              שיוך
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}