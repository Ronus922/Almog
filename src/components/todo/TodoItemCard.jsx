import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, GripVertical, Edit2, Trash2, MessageCircle, UserCheck } from 'lucide-react';
import TodoComments from './TodoComments';
import { getCategoryColor } from './TodoCategoryList';

export default function TodoItemCard({
  item,
  isOwner,
  dragHandleProps,
  dragRef,
  draggableProps,
  isDragging,
  onToggleDone,
  onEdit,
  onDelete,
  currentUsername,
  allUsers = [],
  categoryColor,
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sharedUserName = item.shared_with_user_id
    ? (allUsers.find(u => u.username === item.shared_with_user_id)?.first_name || item.shared_with_user_id)
    : null;

  return (
    <>
      <div
        ref={dragRef}
        {...draggableProps}
        className={`group bg-white border rounded-xl transition-all ${
          isDragging ? 'shadow-xl border-blue-300 rotate-1' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
        } ${item.status === 'done' ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-2 p-3">
          {/* Drag Handle — owner only */}
          {isOwner ? (
            <span
              {...dragHandleProps}
              className="mt-1 cursor-grab text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0"
            >
              <GripVertical className="w-4 h-4" />
            </span>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          {/* Done Toggle — owner only */}
          {isOwner ? (
            <button
              onClick={() => onToggleDone(item)}
              className="mt-0.5 flex-shrink-0 transition-colors"
            >
              {item.status === 'done'
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <Circle className="w-5 h-5 text-slate-300 hover:text-blue-400" />
              }
            </button>
          ) : (
            <span className="mt-0.5 flex-shrink-0">
              {item.status === 'done'
                ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                : <Circle className="w-5 h-5 text-slate-200" />
              }
            </span>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${item.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
            )}
            {/* Shared badge */}
            {sharedUserName && (
              <div className="flex items-center gap-1 mt-1">
                <UserCheck className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-blue-500">משותף עם {sharedUserName}</span>
              </div>
            )}
            {item.status === 'done' && item.completed_at && (
              <p className="text-xs text-green-500 mt-0.5">
                הושלם {new Date(item.completed_at).toLocaleDateString('he-IL')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => setShowDetail(true)}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              title="תגובות"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => onEdit(item)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  title="עריכה"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="מחק"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detail / Comments Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-md w-full" dir="rtl">
          <DialogHeader>
            <DialogTitle className={item.status === 'done' ? 'line-through text-slate-400' : ''}>{item.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {item.description && (
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-3 py-2">{item.description}</p>
            )}
            {sharedUserName && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                <UserCheck className="w-4 h-4" />
                משותף עם {sharedUserName}
              </div>
            )}
            <TodoComments
              itemId={item.id}
              currentUsername={currentUsername}
              isOwner={isOwner}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">למחוק את "{item.title}"? פעולה זו אינה ניתנת לביטול.</p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>ביטול</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { onDelete(item.id); setShowDeleteConfirm(false); }}
            >
              מחק
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}