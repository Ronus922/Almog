import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Search, X, AlertCircle } from 'lucide-react';

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
        className="!p-0 w-full overflow-hidden flex flex-col border-0 rounded-xl"
        style={{ 
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          maxWidth: '95vw',
          height: 'auto',
          maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              title="סגור"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900">שיוך שיחה לגורם קיים</h2>
          </div>
          <p className="text-xs text-slate-500 text-right">בחר את הנתונים הטרום קיימים</p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4" dir="rtl">
          {/* תיבת אזהרה/מידע צהובה */}
          <div className="mb-5 p-3.5 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800 text-right">
              <p className="font-semibold mb-1">שיוך הוא צפוני:</p>
              <p>פנטין לסנור ולהיישור את השיחה עם גורם קיים אחד לאחד וגם להציע ניתוח מעמיק.</p>
            </div>
          </div>

          {/* שורת חיפוש */}
          <div className="space-y-3 mb-5">
            <label className="text-sm font-semibold text-slate-700 block text-right">
              חפש לאנשי קשר
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, דירה או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pr-10 border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* רשימת אנשי קשר */}
          {isLoading ? (
            <div className="text-center py-10 text-slate-500 text-sm">טוען אנשי קשר...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              {contacts.length === 0 ? 'אין אנשי קשר זמינים' : 'לא נמצאו תוצאות'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredContacts.map((contact) => (
                <label
                  key={contact.id}
                  className={`flex items-start gap-3.5 p-3.5 border rounded-lg cursor-pointer transition-all ${
                    selectedContact?.id === contact.id
                      ? 'bg-blue-50 border-blue-300 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="contact"
                    value={contact.id}
                    checked={selectedContact?.id === contact.id}
                    onChange={() => setSelectedContact(contact)}
                    className="w-5 h-5 flex-shrink-0 mt-0.5 cursor-pointer accent-blue-600"
                  />
                  <div className="flex-1 text-right min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{contact.owner_name || '—'}</p>
                    <div className="flex gap-2 mt-1.5 text-xs text-slate-500 justify-end flex-wrap">
                      {contact.apartment_number && (
                        <span className="bg-slate-100 px-2.5 py-1 rounded">דירה {contact.apartment_number}</span>
                      )}
                      {contact.owner_phone && (
                        <span className="bg-slate-100 px-2.5 py-1 rounded">{contact.owner_phone}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer - כפתורים */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100 bg-white">
          <Button 
            onClick={onClose}
            variant="outline"
            className="h-10 px-6 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium rounded-lg"
          >
            השאר לא לשיוך
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedContact}
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <span>בחר גורם לשיוך</span>
            <span className="flex-shrink-0">→</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}