import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Circle, Archive, ClipboardList, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '@/components/auth/AuthContext';
import TodoCategoryList from '@/components/todo/TodoCategoryList';
import TodoItemForm from '@/components/todo/TodoItemForm';
import TodoItemCard from '@/components/todo/TodoItemCard';

const FILTERS = [
  { key: 'mine', label: 'שלי' },
  { key: 'shared', label: 'משותף איתי' },
  { key: 'open', label: 'פתוחים' },
  { key: 'done', label: 'הושלמו' },
];

export default function TodoReminders() {
  const { currentUser } = useAuth();
  const username = currentUser?.username || currentUser?.email || '';
  const queryClient = useQueryClient();

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('mine');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ============== QUERIES ==============

  const { data: allCategories = [] } = useQuery({
    queryKey: ['todo-categories', username],
    queryFn: () => base44.entities.TodoCategory.list(),
    staleTime: 1000 * 30,
    enabled: !!username,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['todo-items', username],
    queryFn: () => base44.entities.TodoItem.list(),
    staleTime: 0,
    enabled: !!username,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['app-users'],
    queryFn: () => base44.entities.AppUser.list(),
    staleTime: 1000 * 60 * 5,
  });

  // ============== DERIVED DATA ==============

  // My categories (not archived)
  const myCategories = useMemo(() =>
    allCategories
      .filter(c => c.owner_user_id === username && !c.is_archived)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [allCategories, username]
  );

  // Items visible to me: owned or shared with me
  const visibleItems = useMemo(() =>
    allItems.filter(i =>
      i.owner_user_id === username || i.shared_with_user_id === username
    ),
    [allItems, username]
  );

  // Item count per category (open items only, for badge)
  const itemCounts = useMemo(() => {
    const counts = {};
    allItems.forEach(i => {
      if (i.owner_user_id === username && i.status === 'open') {
        counts[i.category_id] = (counts[i.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [allItems, username]);

  // Items for current view
  const displayedItems = useMemo(() => {
    let items = visibleItems;

    if (activeFilter === 'mine') {
      items = items.filter(i => i.owner_user_id === username);
      if (selectedCategoryId) items = items.filter(i => i.category_id === selectedCategoryId);
    } else if (activeFilter === 'shared') {
      items = items.filter(i => i.shared_with_user_id === username);
    } else if (activeFilter === 'open') {
      items = items.filter(i => i.owner_user_id === username && i.status === 'open');
      if (selectedCategoryId) items = items.filter(i => i.category_id === selectedCategoryId);
    } else if (activeFilter === 'done') {
      items = items.filter(i => i.owner_user_id === username && i.status === 'done');
      if (selectedCategoryId) items = items.filter(i => i.category_id === selectedCategoryId);
    }

    return [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [visibleItems, activeFilter, selectedCategoryId, username]);

  const selectedCategory = myCategories.find(c => c.id === selectedCategoryId);

  // ============== MUTATIONS ==============

  const createCategoryMutation = useMutation({
    mutationFn: (name) => base44.entities.TodoCategory.create({
      owner_user_id: username,
      name,
      position: myCategories.length,
      is_archived: false,
    }),
    onSuccess: (cat) => {
      queryClient.invalidateQueries({ queryKey: ['todo-categories'] });
      setSelectedCategoryId(cat.id);
      toast.success('קטגוריה נוצרה');
    },
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.TodoCategory.update(id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todo-categories'] }),
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async ({ sourceIdx, destIdx }) => {
      const reordered = [...myCategories];
      const [moved] = reordered.splice(sourceIdx, 1);
      reordered.splice(destIdx, 0, moved);
      await Promise.all(reordered.map((c, i) => base44.entities.TodoCategory.update(c.id, { position: i })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todo-categories'] }),
  });

  const archiveCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.TodoCategory.update(id, { is_archived: true }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['todo-categories'] });
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      toast.success('קטגוריה הועברה לארכיון');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => {
      const catItems = allItems.filter(i => i.category_id === data.category_id);
      const maxPos = catItems.reduce((m, i) => Math.max(m, i.position ?? 0), -1);
      return base44.entities.TodoItem.create({
        ...data,
        owner_user_id: username,
        status: 'open',
        position: maxPos + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items'] });
      toast.success('תזכורת נוספה');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TodoItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todo-items'] }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.TodoItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todo-items'] });
      toast.success('תזכורת נמחקה');
    },
  });

  const toggleDoneMutation = useMutation({
    mutationFn: (item) => {
      if (item.status === 'open') {
        return base44.entities.TodoItem.update(item.id, {
          status: 'done',
          completed_at: new Date().toISOString(),
          completed_by_user_id: username,
        });
      } else {
        return base44.entities.TodoItem.update(item.id, {
          status: 'open',
          completed_at: null,
          completed_by_user_id: null,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todo-items'] }),
  });

  // Drag-and-drop reorder items within category
  const handleItemDragEnd = async (result) => {
    if (!result.destination) return;
    const srcIdx = result.source.index;
    const dstIdx = result.destination.index;
    if (srcIdx === dstIdx) return;

    const reordered = [...displayedItems];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(dstIdx, 0, moved);

    // Optimistic update then persist
    await Promise.all(reordered.map((item, i) =>
      base44.entities.TodoItem.update(item.id, { position: i })
    ));
    queryClient.invalidateQueries({ queryKey: ['todo-items'] });
  };

  const handleSaveItem = async (data) => {
    if (editingItem) {
      await updateItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createItemMutation.mutateAsync(data);
    }
    setEditingItem(null);
  };

  const canDrag = activeFilter === 'mine' || activeFilter === 'open' || activeFilter === 'done';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="w-7 h-7" />
            <h1 className="text-2xl md:text-3xl font-bold">תזכורות</h1>
          </div>
          <p className="text-blue-100 text-sm">ניהול תזכורות ומשימות אישיות לפי קטגוריות</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFilter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Layout: Desktop = side-by-side, Mobile = stacked */}
        <div className="flex flex-col md:flex-row gap-5">

          {/* Categories — shown only for owner filters */}
          {(activeFilter === 'mine' || activeFilter === 'open' || activeFilter === 'done') && (
            <div className="w-full md:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-4">
                <TodoCategoryList
                  categories={myCategories}
                  selectedId={selectedCategoryId}
                  onSelect={(id) => setSelectedCategoryId(prev => prev === id ? null : id)}
                  onCreate={(name) => createCategoryMutation.mutate(name)}
                  onRename={(id, name) => renameCategoryMutation.mutate({ id, name })}
                  onReorder={(src, dst) => reorderCategoriesMutation.mutate({ sourceIdx: src, destIdx: dst })}
                  onArchive={(id) => archiveCategoryMutation.mutate(id)}
                  itemCounts={itemCounts}
                />
              </div>
            </div>
          )}

          {/* Items Panel */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5">
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {activeFilter === 'shared' ? 'פריטים משותפים איתי' :
                     selectedCategory ? selectedCategory.name :
                     activeFilter === 'done' ? 'הושלמו' :
                     activeFilter === 'open' ? 'פתוחים' : 'כל התזכורות'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {displayedItems.length} פריטים
                  </p>
                </div>
                {(activeFilter === 'mine' || activeFilter === 'open') && (
                  <Button
                    onClick={() => { setEditingItem(null); setShowForm(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9"
                    size="sm"
                    disabled={myCategories.length === 0}
                  >
                    <Plus className="w-4 h-4" />
                    תזכורת חדשה
                  </Button>
                )}
              </div>

              {/* No categories prompt */}
              {(activeFilter === 'mine' || activeFilter === 'open') && myCategories.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <ClipboardList className="w-12 h-12 opacity-20" />
                  <p className="text-sm">צור קטגוריה ראשונה כדי להתחיל</p>
                </div>
              )}

              {/* Items List */}
              {displayedItems.length === 0 && myCategories.length > 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <CheckCircle2 className="w-12 h-12 opacity-20" />
                  <p className="text-sm">אין פריטים להצגה</p>
                </div>
              )}

              {displayedItems.length > 0 && (
                <DragDropContext onDragEnd={canDrag ? handleItemDragEnd : () => {}}>
                  <Droppable droppableId="items" isDropDisabled={!canDrag}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                        {displayedItems.map((item, idx) => {
                          const isOwner = item.owner_user_id === username;
                          return (
                            <Draggable
                              key={item.id}
                              draggableId={item.id}
                              index={idx}
                              isDragDisabled={!isOwner || !canDrag}
                            >
                              {(drag, snapshot) => (
                                <TodoItemCard
                                  item={item}
                                  isOwner={isOwner}
                                  dragRef={drag.innerRef}
                                  draggableProps={drag.draggableProps}
                                  dragHandleProps={drag.dragHandleProps}
                                  isDragging={snapshot.isDragging}
                                  onToggleDone={(i) => toggleDoneMutation.mutate(i)}
                                  onEdit={(i) => { setEditingItem(i); setShowForm(true); }}
                                  onDelete={(id) => deleteItemMutation.mutate(id)}
                                  currentUsername={username}
                                  allUsers={allUsers}
                                />
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Item Form Dialog */}
      <TodoItemForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingItem(null); }}
        onSave={handleSaveItem}
        initialData={editingItem ? { ...editingItem } : selectedCategoryId ? { category_id: selectedCategoryId } : null}
        categories={myCategories}
        currentUsername={username}
      />
    </div>
  );
}