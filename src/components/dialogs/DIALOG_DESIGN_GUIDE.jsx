# עיצוב חלון דו-שיח (Dialog Design Guide)

תיאור מפורט של מאפייני ה-UI של חלונות דו-שיח עקביים בכל המערכת.

---

## 1. מעטפת חלון הדו-שיח (DialogContent)

### מיקום וגודל:
- **מיקום**: קבוע במרכז המסך
  - `fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]`
  - מרכוז הן בציר X והן בציר Y

- **רוחב**:
  - `max-w-lg` (576px)
  - `w-full` (למובייל)
  - Inline style: `maxWidth: '472px'` (להתאמה סופית)

- **גובה**:
  - `maxHeight: '90vh'` (כדי להתאים לגבהים שונים של מסכים)

### עיצוב כללי:
- **רקע**: `bg-background` (לבן)
- **צל**: `shadow-lg`
- **גבול**: `border`
- **ריפוד פנימי**: `p-0` (הריפוד מוגדר בתוך כל סקשן)
- **Overflow**: `overflow-hidden flex flex-col` (ניהול גלילה פנימית)
- **כיווניות**: `dir="rtl"` (עברית)
- **פינות מעוגלות**: `rounded-lg`

---

## 2. כפתור סגירה (DialogClose)

### עיצוב:
```jsx
<DialogClose className="absolute left-4 top-4 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors z-10">
  <X className="h-5 w-5 text-white" />
  <span className="sr-only">סגור</span>
</DialogClose>
```

### מאפיינים:
- **מיקום**: `absolute left-4 top-4` (פינה עליונה שמאלית)
- **פינות מעוגלות**: `rounded-lg`
- **רקע**: `bg-white/20` (לבן עם שקיפות)
- **ריפוד**: `p-1.5`
- **אפקט ריחוף**: `hover:bg-white/40`
- **אייקון**: `X` בגודל `h-5 w-5` בצבע `text-white`
- **נגישות**: `sr-only` עם הכיתוב "סגור"

---

## 3. כותרת החלון (Title Bar)

### עטיפה:
```jsx
<div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg flex items-center gap-3">
  <Icon className="w-5 h-5 text-white" />
  <div>
    <div className="text-white text-lg font-bold">כותרת ראשית</div>
    <p className="text-blue-100 text-sm mt-1">תיאור משנה</p>
  </div>
</div>
```

### מאפיינים:
- **רקע**: מעבר צבע `from-blue-600 to-indigo-600` (או צבע משנה בהתאם לסוג דו-שיח)
  - וואטסאפ: `from-green-600 to-emerald-600`
  - הערות: `from-blue-600 to-indigo-600`
- **ריפוד**: `px-6 py-4`
- **פינות מעוגלות**: `rounded-t-lg` (רק בחלק העליון)
- **Layout**: `flex items-center gap-3` (אייקון + טקסט)

### כותרת ראשית:
- **גודל גופן**: `text-lg`
- **משקל גופן**: `font-bold`
- **צבע**: `text-white`

### כותרת משנה (אופציונלי):
- **צבע**: `text-blue-100` (או `text-green-100` לוואטסאפ)
- **גודל גופן**: `text-sm`
- **ריווח עליון**: `mt-1`

---

## 4. אזור התוכן הראשי (Main Content Area)

### עטיפה:
```jsx
<div className="space-y-4 flex-1 overflow-y-auto px-6 pt-4 pb-6">
  {/* תוכן */}
</div>
```

### מאפיינים:
- **ריווח אנכי**: `space-y-4` (בין אלמנטים)
- **גלילה**: `flex-1 overflow-y-auto` (כדי לאפשר גלילה רק בתוך התוכן)
- **ריפוד**: `px-6 pt-4 pb-6`

---

## 5. אזור כפתורי הפעולה התחתונים (DialogFooter)

### עטיפה:
```jsx
<div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
  {/* כפתורים */}
</div>
```

### מאפיינים:
- **Layout**: `flex justify-end gap-2` (יישור לימין עם ריווח בין כפתורים)
- **ריווח**: `gap-2`
- **גבול עליון**: `border-t border-slate-100`
- **רקע**: `bg-white`
- **ריפוד**: `px-6 py-4`
- **Shrink**: `flex-shrink-0` (כדי שלא להתכווץ)

---

## 6. דוגמאות בקוד

### דו-שיח וואטסאפ:
- **אייקון כותרת**: `MessageCircle` בצבע לבן
- **צבע כותרת**: `from-green-600 to-emerald-600`
- **צבע כפתור ראשי**: `bg-green-600 hover:bg-green-700`

### דו-שיח הערות:
- **אייקון כותרת**: `MessageSquare` בצבע לבן
- **צבע כותרת**: `from-blue-600 to-indigo-600`
- **צבע כפתור ראשי**: `bg-blue-600 hover:bg-blue-700`

---

## 7. הנחיות כלליות

### שימוש ב-Tailwind CSS:
הקפדה על שימוש עקבי בקלאסים של Tailwind לקבלת מראה אחיד.

### כיווניות RTL:
כל הרכיבים מיושרים לימין וסדר האלמנטים תואם RTL.

### ריווח:
קבוע: `gap-4`, `space-y-4`, `px-6`, `py-4`

### צבעים:
- **פעיל/הדגשה**: כחול או ירוק בהתאם לנושא
- **טקסט כללי**: אפור/סלייט
- **גבולות**: `border-slate-200`

*מסמך זה משמש כעיתוי עקבי למימוש דו-שיחים בכל המערכת.*