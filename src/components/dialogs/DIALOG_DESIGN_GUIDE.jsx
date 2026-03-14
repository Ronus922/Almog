# עיצוב חלון דו שיח (Dialog Design Guide)

תיאור מפורט של מאפייני ה-UI של חלון דו-שיח לשימוש עקבי ברחבי האתר.

## 1. מעטפת חלון הדו-שיח (DialogContent)

### מיקום וגודל
- **מיקום קבוע**: `fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]`
- **רוחב מקסימלי**: `max-w-lg` (576px) עם `maxWidth: '472px'` ב-inline style
- **גובה מקסימלי**: `maxHeight: '780px'` עם `height: '92vh'` (להתאמה לגבהים שונים)
- **רוחב במובייל**: `width: '100%'`
- **פינות מעוגלות**: `sm:rounded-lg`

### עיצוב כללי
- **רקע**: `bg-background` (לבן)
- **צל**: `shadow-lg`
- **גבול**: `border`
- **ריפוד פנימי**: `p-0` (הריפוד מוגדר בתוך אלמנטים פנימיים)
- **תצוגה**: `overflow-hidden flex flex-col`
- **כיווניות**: `dir="rtl"`

## 2. כפתור סגירה (DialogClose)

- **מיקום**: `absolute left-4 top-4` (פינה שמאלית עליונה)
- **פינות**: `rounded-lg`
- **רקע**: `bg-white/20` (לבן עם שקיפות)
- **ריפוד**: `p-1.5`
- **ריחוף**: `hover:bg-white/40`
- **אייקון**: X בגודל `h-5 w-5` בצבע `text-white`
- **נגישות**: `sr-only` עם הכיתוב "סגור"

## 3. כותרת החלון (Header)

### עטיפה
- **רקע**: `bg-gradient-to-r from-blue-600 to-indigo-600`
- **ריפוד**: `px-6 py-4`
- **פינות**: `rounded-t-lg` (עליון בלבד)
- **תצוגה**: `flex items-center justify-between gap-3`

### כותרת ראשית (DialogTitle)
- **צבע**: `text-white`
- **גודל**: `text-lg`
- **משקל**: `font-bold`
- **כיווניות**: `text-right`

### כותרת משנה (אופציונלי)
- **אלמנט**: `<p>`
- **צבע**: `text-blue-100`
- **גודל**: `text-sm`
- **ריווח עליון**: `mt-1`

## 4. אזור התוכן הראשי (Content Area)

### עטיפה
- **ריווח אנכי**: `space-y-4`
- **ריפוד**: `px-6 pt-4 pb-4`
- **גלילה**: `overflow-y-auto flex-1`

### קבוצות שדות (שני שדות בשורה)
- **תצוגה**: `grid grid-cols-2 gap-4`

### שדה בודד
- **ריווח**: `space-y-2`

### Label
- **גודל**: `text-sm`
- **משקל**: `font-semibold`
- **צבע**: `text-slate-700`
- **כיווניות**: `text-right block`

### Input / Select / Textarea
- **גובה Input**: `h-9`
- **גובה Select/Textarea**: `h-10` (לפי צורך)
- **גבול**: `border border-slate-200`
- **פינות**: `rounded-lg`
- **רקע**: `bg-white`
- **צבע טקסט**: `text-sm text-slate-700`
- **פוקוס**: `focus:ring-1 focus:ring-blue-500 focus:border-blue-500`
- **Placeholder**: `placeholder:text-muted-foreground`
- **כיווניות**: `dir="rtl"`

### DateTimePicker
- **רוחב**: `w-full`
- **גובה טריגר**: `h-10`
- **עיצוב**: כמו Input/Select

## 5. אזור כפתורים (Footer)

### עטיפה
- **תצוגה**: `flex justify-end gap-2`
- **ריפוד**: `px-6 py-4`
- **גבול עליון**: `border-t border-slate-100`
- **רקע**: `bg-white`
- **גמישות**: `flex-shrink-0`

### כפתור ראשי (Primary Button)
- **צבע**: `bg-[#3563d0]` (כחול מודגש)
- **טקסט**: `text-white`
- **גובה**: `h-9`
- **ריפוד**: `px-4 py-2`
- **פינות**: `rounded-md`
- **אייקון**: `gap-2`
- **ריחוף**: `hover:bg-[#2a50b0]`

### כפתור משני (Outline Button)
- **variant**: `outline`
- **גובה**: `h-9`
- **ריווח**: `gap-2`

## 6. טאבים (אם קיימים)

### עטיפה
- **תצוגה**: `flex border-b border-slate-200`
- **ריווח**: `px-6 pt-4`

### כפתור טאב
- **ריפוד**: `px-4 py-2`
- **גודל**: `text-sm`
- **משקל**: `font-medium`
- **מעבר**: `transition-colors`

### טאב פעיל
- **קו תחתון**: `border-b-2 border-blue-600`
- **צבע**: `text-blue-600`

### טאב לא פעיל
- **צבע**: `text-slate-500`
- **ריחוף**: `hover:text-slate-700`

## הנחיות כלליות

### Tailwind CSS
- שימוש עקבי בקלאסים ל-Tailwind
- עבור צבעים דינמיים: הוסף את הצבעים ל-safelist ב-tailwind.config.js

### כיווניות RTL
- כל הרכיבים מיושרים לימין
- סדר אלמנטים תואם RTL
- `dir="rtl"` על elements שונים לפי הצורך

### ריווחים
- ריווחים קבועים: `gap-4`, `space-y-2`, `px-6`, `py-4`
- עקביות בכל המסכים

### טיפוגרפיה
- גודלים עקביים: `text-sm`, `text-base`, `text-lg`
- משקלים: `font-semibold`, `font-bold`
- צבעים: `text-slate-700`, `text-white`, `text-blue-100`

### צבעים
- פעיל/הדגשה: גוונים של כחול (`blue-600`, `indigo-600`)
- טקסט כללי: גוונים של אפור (`slate-700`, `slate-500`)
- גבולות: `slate-200`, `slate-100`
- רקע: `white`, `bg-background`

### רכיבים מוגדרים מראש
- Input, Select, Textarea, Button מ-`@/components/ui`
- קבוצות שדות עם grid ו-gaps
- DialogTitle, DialogDescription, DialogContent לנגישות

## דוגמה למבנה בסיסי

```jsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent 
    className="max-w-lg max-h-[92vh] overflow-hidden flex flex-col rounded-lg"
    dir="rtl"
    aria-describedby={undefined}
  >
    {/* Header */}
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg text-white relative">
      <button className="absolute left-4 top-4 rounded-lg bg-white/20 p-1.5 hover:bg-white/40">
        <X className="h-5 w-5 text-white" />
      </button>
      <DialogHeader>
        <DialogTitle className="text-right">כותרת</DialogTitle>
        <DialogDescription className="sr-only">תיאור</DialogDescription>
      </DialogHeader>
    </div>

    {/* Content */}
    <div className="space-y-4 overflow-y-auto flex-1 px-6 pt-4 pb-4" dir="rtl">
      {/* Field groups */}
    </div>

    {/* Footer */}
    <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
      <Button variant="outline">ביטול</Button>
      <Button className="bg-[#3563d0] hover:bg-[#2a50b0]">שמור</Button>
    </div>
  </DialogContent>
</Dialog>
```

## ההנחיה העליונה

יישום עקבי של הנחיות אלו יוביל לממשק אחיד, מעוצב היטב ונעים לשימוש בכל חלקי האפליקציה.