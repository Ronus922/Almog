import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CalendarQuickFilters({
  itemTypeFilter,
  meetingTypeFilter,
  userFilter,
  onItemTypeChange,
  onMeetingTypeChange,
  onUserChange,
  onClearAll,
}) {
  const [users, setUsers] = useState([]);
  const [meetingTypes, setMeetingTypes] = useState([]);
  const [showAddMeetingType, setShowAddMeetingType] = useState(false);
  const [newMeetingTypeName, setNewMeetingTypeName] = useState('');
  const [isCreatingType, setIsCreatingType] = useState(false);
  const addTypeInputRef = useRef(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersList = await base44.entities.AppUser.list();
        setUsers(usersList || []);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    loadUsers();
  }, []);

  // Load meeting types from MeetingType entity
  useEffect(() => {
    const loadMeetingTypes = async () => {
      try {
        const types = await base44.entities.MeetingType.list();
        setMeetingTypes(types.filter(t => t.is_active) || []);
      } catch (error) {
        console.error('Failed to load meeting types:', error);
      }
    };

    loadMeetingTypes();
  }, []);

  const handleAddMeetingType = async () => {
    const trimmedName = newMeetingTypeName.trim();
    
    if (!trimmedName) {
      alert('אנא הזן שם לסוג הפגישה');
      return;
    }

    // Check for duplicates
    if (meetingTypes.some(t => t.name === trimmedName)) {
      alert('סוג פגישה זה כבר קיים');
      return;
    }

    setIsCreatingType(true);
    try {
      const newType = await base44.entities.MeetingType.create({
        name: trimmedName,
        is_active: true,
      });
      
      setMeetingTypes([...meetingTypes, newType]);
      onMeetingTypeChange(trimmedName);
      setNewMeetingTypeName('');
      setShowAddMeetingType(false);
    } catch (error) {
      console.error('Failed to create meeting type:', error);
      alert('שגיאה ביצירת סוג פגישה');
    } finally {
      setIsCreatingType(false);
    }
  };

  useEffect(() => {
    if (showAddMeetingType && addTypeInputRef.current) {
      addTypeInputRef.current.focus();
    }
  }, [showAddMeetingType]);

  const hasActiveFilters = itemTypeFilter !== 'הכל' || meetingTypeFilter || userFilter;

  return (
    <div className="flex flex-col gap-4 mb-6" dir="rtl">
      {/* Quick Filter Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Item Type Filter */}
        <Select value={itemTypeFilter || 'הכל'} onValueChange={onItemTypeChange}>
          <SelectTrigger className="w-48 h-10 text-sm">
            <SelectValue placeholder="סוג פריט" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="הכל">הכל</SelectItem>
            <SelectItem value="משימות">משימות</SelectItem>
            <SelectItem value="פגישות">פגישות</SelectItem>
          </SelectContent>
        </Select>

        {/* Meeting Type Filter */}
        <Select value={meetingTypeFilter || ''} onValueChange={onMeetingTypeChange}>
          <SelectTrigger className="w-48 h-10 text-sm">
            <SelectValue placeholder="סוג פגישה" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value={null}>כל הסוגים</SelectItem>
            {meetingTypes.map(type => (
              <SelectItem key={type.id} value={type.name}>
                {type.name}
              </SelectItem>
            ))}
            {!showAddMeetingType && (
              <button
                onClick={() => setShowAddMeetingType(true)}
                className="w-full text-right px-2 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-slate-200 mt-2 flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                הוסף סוג חדש
              </button>
            )}
          </SelectContent>
        </Select>

        {/* Inline Add Meeting Type */}
        {showAddMeetingType && (
          <div className="flex gap-2">
            <Input
              ref={addTypeInputRef}
              value={newMeetingTypeName}
              onChange={(e) => setNewMeetingTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddMeetingType();
                } else if (e.key === 'Escape') {
                  setShowAddMeetingType(false);
                  setNewMeetingTypeName('');
                }
              }}
              placeholder="שם סוג פגישה חדש"
              className="h-10 text-sm"
              disabled={isCreatingType}
              dir="rtl"
            />
            <Button
              size="sm"
              onClick={handleAddMeetingType}
              disabled={isCreatingType}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreatingType ? 'שומר...' : 'שמור'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddMeetingType(false);
                setNewMeetingTypeName('');
              }}
              className="h-10"
            >
              ביטול
            </Button>
          </div>
        )}

        {/* User Filter */}
         <Select value={String(userFilter ?? '')} onValueChange={onUserChange}>
           <SelectTrigger className="w-48 h-10 text-sm">
             <SelectValue placeholder="משתמש" />
           </SelectTrigger>
           <SelectContent dir="rtl">
             <SelectItem value={null}>כל המשתמשים</SelectItem>
             {users.map(user => (
               <SelectItem key={user.id} value={user.id}>
                 {user.first_name && user.last_name
                   ? `${user.first_name} ${user.last_name}`
                   : user.username}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="gap-2 text-xs h-10"
          >
            <X className="w-3 h-3" />
            נקה הכל
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {itemTypeFilter !== 'הכל' && (
            <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200">
              <span>סוג: {itemTypeFilter}</span>
              <button
                onClick={() => {
                  onItemTypeChange('הכל');
                }}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {meetingTypeFilter && (
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium border border-green-200">
              <span>סוג פגישה: {meetingTypeFilter}</span>
              <button
                onClick={() => onMeetingTypeChange('')}
                className="hover:text-green-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {userFilter && (
            <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-medium border border-purple-200">
              <span>משתמש: {users.find(u => u.id === userFilter)?.first_name || users.find(u => u.id === userFilter)?.username || userFilter}</span>
              <button
                onClick={() => onUserChange('')}
                className="hover:text-purple-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}