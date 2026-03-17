import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Search, X, LinkIcon } from 'lucide-react';

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
        className="max-w-lg max-h-[92vh] overflow-hidden flex flex-col rounded-lg p-0"
        dir="rtl"
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg text-white relative">
          <button 
            onClick={onClose}
            className="absolute left-4 top-4 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
            <span className="sr-only">סגור</span>
          </button>
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2 text-lg font-bold">
              <LinkIcon className="w-5 h-5" />
              שיוך שיחה לגורם קיים
            </DialogTitle>
            <DialogDescription className="text-right text-blue-100 text-sm mt-1">
              בחר את הגורם לשיוך השיחה ממספר הטלפון {chatMessage?.contact_phone || ''}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="space-y-4 overflow-y-auto flex-1 px-6 pt-4 pb-4" dir="rtl">
          {/* שורת חיפוש */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 text-right block">
              חיפוש גורם
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, דירה או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pr-10 border-slate-200 rounded-lg"
                dir="rtl"
              />
            </div>
          </div>

          {/* רשימת אנשי קשר */}
          <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-slate-500 text-sm">טוען אנשי קשר...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                {contacts.length === 0 ? 'אין אנשי קשר זמינים' : 'לא נמצאו תוצאות'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                      selectedContact?.id === contact.id
                        ? 'bg-blue-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contact"
                      value={contact.id}
                      checked={selectedContact?.id === contact.id}
                      onChange={() => setSelectedContact(contact)}
                      className="mt-1 flex-shrink-0 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0 text-right">
                      <p className="font-medium text-slate-900 text-sm">{contact.owner_name || '—'}</p>
                      <div className="flex gap-2 mt-0.5 text-xs text-slate-600 justify-end">
                        {contact.apartment_number && (
                          <span className="text-blue-600 font-medium">דירה {contact.apartment_number}</span>
                        )}
                        {contact.owner_phone && (
                          <span className="text-blue-600">{contact.owner_phone}</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="h-9"
          >
            ביטול
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedContact}
            className="h-9 bg-[#3563d0] hover:bg-[#2a50b0] text-white"
          >
            שיוך
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}