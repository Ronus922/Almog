import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CalendarQuickFilters({
  meetingTypeFilter,
  userFilter,
  onMeetingTypeChange,
  onUserChange,
  onClearAll,
}) {
  const [users, setUsers] = useState([]);
  const [meetingTypes, setMeetingTypes] = useState([]);

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

  // Extract unique meeting types from appointments
  useEffect(() => {
    const loadMeetingTypes = async () => {
      try {
        const events = await base44.entities.CalendarEvent.list();
        const types = [...new Set(events
          .filter(e => e.meeting_type)
          .map(e => e.meeting_type)
        )];
        setMeetingTypes(types);
      } catch (error) {
        console.error('Failed to load meeting types:', error);
      }
    };

    loadMeetingTypes();
  }, []);

  const hasActiveFilters = meetingTypeFilter || userFilter;

  return (
    <div className="flex flex-col gap-4 mb-6" dir="rtl">
      {/* Quick Filter Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={meetingTypeFilter || ''} onValueChange={onMeetingTypeChange}>
          <SelectTrigger className="w-48 h-10 text-sm">
            <SelectValue placeholder="סוג פגישה" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value={null}>כל הסוגים</SelectItem>
            {meetingTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={userFilter || ''} onValueChange={onUserChange}>
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
          {meetingTypeFilter && (
            <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200">
              <span>סוג: {meetingTypeFilter}</span>
              <button
                onClick={() => onMeetingTypeChange('')}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {userFilter && (
            <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-medium border border-purple-200">
              <span>משתמש: {users.find(u => u.id === userFilter)?.first_name || userFilter}</span>
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