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
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] p-0 w-full border-0 shadow-lg overflow-hidden flex flex-col"
        style={{ maxWidth: '476px', height: '92vh', maxHeight: '780px', borderRadius: '8px' }}
        dir="rtl"
      >
        {/* Header - כותרת כחולה */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 flex items-center justify-between relative">
          <button 
            onClick={onClose}
            className="absolute left-4 top-3 bg-white/20 hover:bg-white/30 p-1.5 rounded transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <h2 className="text-white text-lg font-bold text-right flex-1">עריכת משימה</h2>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4" dir="rtl">
          {/* שורת חיפוש */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-semibold text-slate-700 block text-right">
              חיפוש גורם
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, דירה או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pr-10 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* רשימת אנשי קשר */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">טוען אנשי קשר...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
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
                      : 'border-slate-200 hover:border-slate-300'
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
                  <div className="flex-1 text-right">
                    <p className="font-medium text-slate-900 text-sm">{contact.owner_name || '—'}</p>
                    {contact.apartment_number && (
                      <p className="text-xs text-blue-600">דירה {contact.apartment_number}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer - כפתורים */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-200 bg-white">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="h-9 px-6 text-slate-700"
          >
            ביטול
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedContact}
            className="h-9 px-6 bg-[#3563d0] hover:bg-[#2a50b0] text-white font-semibold"
          >
            שיוך
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}