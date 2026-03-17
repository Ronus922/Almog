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
        className="!p-0 w-full overflow-hidden flex flex-col border-0"
        style={{ 
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '520px',
          maxWidth: '95vw',
          height: 'auto',
          maxHeight: '85vh',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        dir="rtl"
      >
        {/* Header - כותרת כחולה */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between relative h-14">
          <button 
            onClick={onClose}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/25 hover:bg-white/35 p-2 rounded transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <h2 className="text-white text-base font-bold text-right flex-1 pr-8">שיוך שיחה לגורם קיים</h2>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5" dir="rtl">
          {/* שורת חיפוש */}
          <div className="space-y-3 mb-5">
            <label className="text-sm font-semibold text-slate-700 block text-right">
              חיפוש גורם
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, דירה או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pr-10 border border-slate-200 rounded-md text-sm"
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
                  className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-all ${
                    selectedContact?.id === contact.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="contact"
                    value={contact.id}
                    checked={selectedContact?.id === contact.id}
                    onChange={() => setSelectedContact(contact)}
                    className="w-4 h-4 flex-shrink-0"
                  />
                  <div className="flex-1 text-right min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{contact.owner_name || '—'}</p>
                    <div className="flex gap-2 mt-1 text-xs text-slate-600 justify-end">
                      {contact.apartment_number && (
                        <span>דירה {contact.apartment_number}</span>
                      )}
                      {contact.owner_phone && (
                        <span>{contact.owner_phone}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer - כפתורים */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100 bg-white h-16 items-center">
          <Button 
            onClick={onClose}
            className="h-9 px-5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm"
          >
            ביטול
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedContact}
            className="h-9 px-5 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm"
          >
            שיוך
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}