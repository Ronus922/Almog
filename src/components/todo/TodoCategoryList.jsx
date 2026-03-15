import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Archive, Folder, GripVertical, AlertCircle, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const COLOR_OPTIONS = [
{ key: 'blue', label: 'כחול', dot: 'bg-blue-500', soft: 'bg-blue-50 border-blue-200', selected: 'bg-blue-600 text-white' },
{ key: 'green', label: 'ירוק', dot: 'bg-green-500', soft: 'bg-green-50 border-green-200', selected: 'bg-green-600 text-white' },
{ key: 'orange', label: 'כתום', dot: 'bg-orange-400', soft: 'bg-orange-50 border-orange-200', selected: 'bg-orange-500 text-white' },
{ key: 'purple', label: 'סגול', dot: 'bg-purple-500', soft: 'bg-purple-50 border-purple-200', selected: 'bg-purple-600 text-white' },
{ key: 'pink', label: 'ורוד', dot: 'bg-pink-400', soft: 'bg-pink-50 border-pink-200', selected: 'bg-pink-500 text-white' }];


export function getCategoryColor(colorKey) {
  return COLOR_OPTIONS.find((c) => c.key === colorKey) || COLOR_OPTIONS[0];
}

export default function TodoCategoryList({
  categories,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onReorder,
  onArchive,
  itemCounts = {}
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('blue');
  const [archiveAlert, setArchiveAlert] = useState(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim(), newColor);
    setNewName('');
    setNewColor('blue');
    setShowCreate(false);
  };

  const handleRename = (id) => {
    if (!editingName.trim()) {setEditingId(null);return;}
    onRename(id, editingName.trim(), editingColor);
    setEditingId(null);
    setEditingName('');
  };

  const startEdit = (cat, e) => {
    e.stopPropagation();
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingColor(cat.color || 'blue');
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

      {archiveAlert &&
      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{archiveAlert}</span>
          <button onClick={() => setArchiveAlert(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      }

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided) =>
          <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 space-y-1 overflow-y-auto">
              {categories.map((cat, idx) => {
              const isSelected = cat.id === selectedId;
              const count = itemCounts[cat.id] || 0;
              const colorObj = getCategoryColor(cat.color);
              return (
                <Draggable key={cat.id} draggableId={cat.id} index={idx}>
                    {(drag, snapshot) =>
                  <div
                    ref={drag.innerRef}
                    {...drag.draggableProps} className="bg-slate-100 text-slate-700 px-3 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all group border border-transparent hover:bg-slate-50"





                    onClick={() => onSelect(cat.id)}>

                        <span {...drag.dragHandleProps} className="opacity-30 group-hover:opacity-60 cursor-grab" onClick={(e) => e.stopPropagation()}>
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>

                        {/* Color dot */}
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorObj.dot}`} />

                        {editingId === cat.id ?
                    <input
                      className="flex-1 bg-white text-slate-900 border border-blue-300 rounded px-2 py-0.5 text-sm"
                      value={editingName}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRename(cat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(cat.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }} /> :


                    <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
                    }

                        <div className={`flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <button
                        onClick={(e) => startEdit(cat, e)}
                        className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-500">

                             <Edit2 className="w-3 h-3" />
                           </button>
                           <button
                        onClick={(e) => {e.stopPropagation();handleArchive(cat);}}
                        className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-500">

                             <Archive className="w-3 h-3" />
                           </button>

                        {count > 0 &&
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colorObj.soft}`}>
                            {count}
                          </span>
                        }
                         </div>
                      </div>
                  }
                  </Draggable>);

            })}
              {provided.placeholder}
            </div>
          }
        </Droppable>
      </DragDropContext>

      {categories.length === 0 &&
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 py-8">
          <Folder className="w-10 h-10 opacity-30" />
          <p>אין קטגוריות עדיין</p>
        </div>
      }

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-background shadow-lg border p-0 overflow-hidden flex flex-col sm:rounded-lg"
          style={{ maxWidth: '470px', width: '100%', maxHeight: '580px' }}
          dir="rtl">

          {/* כפתור סגירה */}
          <button
            onClick={() => {setShowCreate(false);setNewName('');setNewColor('blue');}}
            className="absolute left-4 top-4 z-10 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors">

            <X className="h-5 w-5 text-white" />
            <span className="sr-only">סגור</span>
          </button>
          {/* כותרת */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg">
            <DialogHeader className="sr-only"><DialogTitle>קטגוריה חדשה</DialogTitle></DialogHeader>
            <p className="text-white text-lg font-bold">קטגוריה חדשה</p>
          </div>
          {/* תוכן */}
          <div className="space-y-4 px-6 pt-5 pb-2 flex-1">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">שם הקטגוריה <span className="text-red-500">*</span></label>
              <Input
                placeholder="לדוגמה: עבודה, אישי..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                dir="rtl"
                className="h-10 border-slate-200 rounded-lg"
                onKeyDown={(e) => {if (e.key === 'Enter') handleCreate();}} />

            </div>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          {/* כפתורים */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
            <Button
              disabled={!newName.trim()}
              onClick={handleCreate}
              className="bg-[#3563d0] text-white h-9 px-4 text-sm font-medium rounded-md shadow hover:bg-blue-700">

              צור קטגוריה
            </Button>
            <Button variant="outline" className="h-9" onClick={() => {setShowCreate(false);setNewName('');setNewColor('blue');}}>ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => {if (!open) setEditingId(null);}}>
        <DialogContent
          className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-background shadow-lg border p-0 overflow-hidden flex flex-col sm:rounded-lg"
          style={{ maxWidth: '470px', width: '100%', maxHeight: '580px' }}
          dir="rtl">

          {/* כפתור סגירה */}
          <button
            onClick={() => setEditingId(null)}
            className="absolute left-4 top-4 z-10 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors">

            <X className="h-5 w-5 text-white" />
            <span className="sr-only">סגור</span>
          </button>
          {/* כותרת */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg">
            <DialogHeader className="sr-only"><DialogTitle>עריכת קטגוריה</DialogTitle></DialogHeader>
            <p className="text-white text-lg font-bold">עריכת קטגוריה</p>
          </div>
          {/* תוכן */}
          <div className="space-y-4 px-6 pt-5 pb-2 flex-1">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">שם הקטגוריה <span className="text-red-500">*</span></label>
              <Input
                placeholder="שם הקטגוריה"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                autoFocus
                dir="rtl"
                className="h-10 border-slate-200 rounded-lg"
                onKeyDown={(e) => {if (e.key === 'Enter') handleRename(editingId);}} />

            </div>
            <ColorPicker value={editingColor} onChange={setEditingColor} />
          </div>
          {/* כפתורים */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
            <Button
              disabled={!editingName.trim()}
              onClick={() => handleRename(editingId)}
              className="bg-[#3563d0] text-white h-9 px-4 text-sm font-medium rounded-md shadow hover:bg-blue-700">

              שמור שינויים
            </Button>
            <Button variant="outline" className="h-9" onClick={() => setEditingId(null)}>ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}

function ColorPicker({ value, onChange }) {
  const colors = [
  { key: 'blue', label: 'כחול', bg: 'bg-blue-500' },
  { key: 'green', label: 'ירוק', bg: 'bg-green-500' },
  { key: 'orange', label: 'כתום', bg: 'bg-orange-400' },
  { key: 'purple', label: 'סגול', bg: 'bg-purple-500' },
  { key: 'pink', label: 'ורוד', bg: 'bg-pink-400' }];

  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-2">צבע קטגוריה</label>
      <div className="flex gap-2 flex-wrap">
        {colors.map((c) =>
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
          value === c.key ?
          'border-slate-400 bg-slate-100 text-slate-800 shadow-sm' :
          'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`
          }>

            <span className={`w-3 h-3 rounded-full ${c.bg}`} />
            {c.label}
          </button>
        )}
      </div>
    </div>);

}