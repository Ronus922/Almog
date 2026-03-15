import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Archive, Folder, FolderOpen, GripVertical, AlertCircle, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function TodoCategoryList({
  categories,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onReorder,
  onArchive,
  itemCounts = {},
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [archiveAlert, setArchiveAlert] = useState(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  const handleRename = (id) => {
    if (!editingName.trim()) { setEditingId(null); return; }
    onRename(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  const handleArchive = (cat) => {
    const count = itemCounts[cat.id] || 0;
    if (count > 0) {
      setArchiveAlert(`לא ניתן לארכב קטגוריה שמכילה ${count} פריטים. יש להסיר או להשלים את כל הפריטים תחילה.`);
      return;
    }
    onArchive(cat.id);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800">קטגוריות</h2>
        <Button size="sm" onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 gap-1">
          <Plus className="w-3.5 h-3.5" />
          חדשה
        </Button>
      </div>

      {archiveAlert && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{archiveAlert}</span>
          <button onClick={() => setArchiveAlert(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 space-y-1 overflow-y-auto">
              {categories.map((cat, idx) => {
                const isSelected = cat.id === selectedId;
                const count = itemCounts[cat.id] || 0;
                return (
                  <Draggable key={cat.id} draggableId={cat.id} index={idx}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all group ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'hover:bg-slate-100 text-slate-700'
                        } ${snapshot.isDragging ? 'shadow-lg opacity-90' : ''}`}
                        onClick={() => onSelect(cat.id)}
                      >
                        <span {...drag.dragHandleProps} className="opacity-30 group-hover:opacity-60 cursor-grab" onClick={e => e.stopPropagation()}>
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>

                        {isSelected ? <FolderOpen className="w-4 h-4 flex-shrink-0" /> : <Folder className="w-4 h-4 flex-shrink-0 text-blue-500" />}

                        {editingId === cat.id ? (
                          <input
                            className="flex-1 bg-white text-slate-900 border border-blue-300 rounded px-2 py-0.5 text-sm"
                            value={editingName}
                            autoFocus
                            onClick={e => e.stopPropagation()}
                            onChange={e => setEditingName(e.target.value)}
                            onBlur={() => handleRename(cat.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRename(cat.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                        ) : (
                          <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
                        )}

                        {count > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>{count}</span>
                        )}

                        <div className={`flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditingId(cat.id); setEditingName(cat.name); }}
                            className={`p-1 rounded hover:bg-white/20 transition-colors`}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleArchive(cat); }}
                            className="p-1 rounded hover:bg-white/20 transition-colors"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {categories.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 py-8">
          <Folder className="w-10 h-10 opacity-30" />
          <p>אין קטגוריות עדיין</p>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>קטגוריה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="שם הקטגוריה"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
              dir="rtl"
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowCreate(false); setNewName(''); }}>ביטול</Button>
              <Button disabled={!newName.trim()} onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">צור</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}