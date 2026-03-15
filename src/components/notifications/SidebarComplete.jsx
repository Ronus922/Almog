import { useState, useEffect } from "react";
import { Bell, Palette } from "lucide-react";

const SIDEBAR_THEME = {
  bgGradientFrom: "#1e3a6e",
  bgGradientMid: "#1a3260",
  bgGradientTo: "#162a52",
  itemActiveText: "rgba(255,255,255,1)",
  itemActiveBg: "rgba(255,255,255,0.20)",
  itemInactiveText: "rgba(255,255,255,0.60)",
  itemHoverBg: "rgba(255,255,255,0.10)",
  logoBg: "rgba(255,255,255,0.20)",
  dividerColor: "rgba(255,255,255,0.10)",
  userInitialsBg: "rgba(255,255,255,0.20)",
  userNameText: "rgba(255,255,255,1)",
  userRoleText: "rgba(255,255,255,0.40)",
  logoutText: "rgba(255,255,255,0.50)",
  logoutHoverBg: "rgba(255,255,255,0.10)",
  mobileHeaderBg: "#1e3a6e",
  textMode: "dark",
};

const THEME_PRESETS = {
  darkBlue: SIDEBAR_THEME,
  cloud: {
    bgGradientFrom: "#f8fafc",
    bgGradientMid: "#f1f5f9",
    bgGradientTo: "#e2e8f0",
    mobileHeaderBg: "#f8fafc",
    itemActiveText: "#1e40af",
    itemActiveBg: "rgba(59,130,246,0.12)",
    itemInactiveText: "#64748b",
    itemHoverBg: "rgba(59,130,246,0.07)",
    userNameText: "#1e293b",
    userRoleText: "#94a3b8",
    logoutText: "#94a3b8",
    logoutHoverBg: "rgba(0,0,0,0.05)",
    dividerColor: "rgba(0,0,0,0.07)",
    userInitialsBg: "rgba(59,130,246,0.15)",
    logoBg: "rgba(59,130,246,0.15)",
    textMode: "light",
  },
  sky: {
    bgGradientFrom: "#eff6ff",
    bgGradientMid: "#dbeafe",
    bgGradientTo: "#bfdbfe",
    mobileHeaderBg: "#eff6ff",
    itemActiveText: "#1d4ed8",
    itemActiveBg: "rgba(29,78,216,0.12)",
    itemInactiveText: "#3b82f6",
    itemHoverBg: "rgba(29,78,216,0.07)",
    userNameText: "#1e3a8a",
    userRoleText: "#60a5fa",
    logoutText: "#93c5fd",
    logoutHoverBg: "rgba(29,78,216,0.08)",
    dividerColor: "rgba(29,78,216,0.12)",
    userInitialsBg: "rgba(29,78,216,0.15)",
    logoBg: "rgba(29,78,216,0.15)",
    textMode: "light",
  },
};

export default function SidebarComplete({
  collapsed = false,
  mobile = false,
  appTheme = THEME_PRESETS,
  currentTheme = "darkBlue",
  onThemeChange = () => {},
  notifications = [],
  onNotificationDismiss = () => {},
  appName = "מערכת",
  showTestButton = true
}) {
  const [status, setStatus] = useState("default");
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);
  const T = appTheme[currentTheme] || appTheme.darkBlue;

  useEffect(() => {
    if ("Notification" in window) {
      setStatus(Notification.permission);
    }
  }, []);

  async function handleRequestNotifications() {
    if (!("Notification" in window)) return;
    if (status === "granted" || status === "denied") return;
    const result = await Notification.requestPermission();
    setStatus(result);
    if (result === "granted") {
      new Notification(`${appName} 🔔`, {
        body: "התראות הופעלו! תקבל עדכונים על משימות ותקלות.",
        icon: "/favicon.ico",
      });
    }
  }

  function handleTestNotification() {
    if (status === "granted") {
      new Notification("בדיקה - משימה חדשה", {
        body: "משימת ניקיון חדשה הוקצתה לך בחדר 205",
        icon: "/favicon.ico",
        tag: "test",
      });
    }
  }

  const isGranted = status === "granted";
  const isDenied = status === "denied";

  return (
    <div className="space-y-2">
      <button
        onClick={handleRequestNotifications}
        disabled={isDenied}
        title={isDenied ? "התראות חסומות בדפדפן" : "הפעל התראות"}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 w-full font-semibold text-sm transition-all ${collapsed && !mobile ? "justify-center" : ""}`}
        style={{
          background: isGranted ? "rgba(74, 222, 128, 0.15)" : isDenied ? "rgba(107, 114, 128, 0.10)" : "rgba(249, 115, 22, 0.85)",
          color: isGranted ? "#22c55e" : isDenied ? "rgba(255,255,255,0.3)" : "#fff",
          opacity: isDenied ? 0.5 : 1,
          boxShadow: isGranted ? "0 0 0 2px rgba(74, 222, 128, 0.2)" : "0 0 12px rgba(249, 115, 22, 0.4)",
          border: "none",
          cursor: isDenied ? "not-allowed" : "pointer"
        }}
        onMouseEnter={e => {
          if (!isDenied) {
            e.currentTarget.style.background = isGranted ? "rgba(74, 222, 128, 0.25)" : "rgba(234, 88, 12, 0.95)";
          }
        }}
        onMouseLeave={e => {
          if (!isDenied) {
            e.currentTarget.style.background = isGranted ? "rgba(74, 222, 128, 0.15)" : "rgba(249, 115, 22, 0.85)";
          }
        }}
      >
        <div className="relative flex-shrink-0">
          <Bell size={16} />
          {!isGranted && !isDenied && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white animate-pulse" />}
          {isGranted && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400" />}
        </div>
        {(!collapsed || mobile) && (
          <span>
            {isGranted ? "התראות פעילות" : isDenied ? "התראות חסומות" : "הפעל התראות"}
          </span>
        )}
      </button>

      {showTestButton && isGranted && (!collapsed || mobile) && (
        <button
          onClick={handleTestNotification}
          className="flex items-center gap-2 rounded-xl px-3 py-2 w-full text-xs font-medium transition-all"
          style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", border: "none", cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(59, 130, 246, 0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)"; }}
        >
          <Bell size={13} />
          <span>בדוק התראה</span>
        </button>
      )}

      <div className="relative">
        <button
          onClick={() => setOpenNotifications(!openNotifications)}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 w-full font-semibold text-sm transition-all"
          style={{ background: openNotifications ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", color: T.itemActiveText, border: "none", cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { if (!openNotifications) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        >
          <Bell size={16} />
          {(!collapsed || mobile) && <span>הודעות ({notifications.length})</span>}
        </button>

        {openNotifications && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-80 overflow-y-auto" dir="rtl">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">אין הודעות חדשות</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notif => (
                  <div key={notif.id} className="px-4 py-3 flex items-start gap-2 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{notif.title}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{notif.message}</p>
                    </div>
                    <button onClick={() => onNotificationDismiss(notif.id)} className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setOpenTheme(!openTheme)}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 w-full font-semibold text-sm transition-all"
          style={{ background: openTheme ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", color: T.itemActiveText, border: "none", cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { if (!openTheme) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        >
          <Palette size={16} />
          {(!collapsed || mobile) && <span>שנה עיצוב</span>}
        </button>

        {openTheme && (
          <div className="absolute bottom-full mb-2 right-0 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50 p-3" dir="rtl">
            <p className="text-[10px] font-bold text-gray-400 mb-3 uppercase">בחר סגנון</p>
            <div className="space-y-2">
              {Object.keys(appTheme).map(themeName => (
                <button
                  key={themeName}
                  onClick={() => { onThemeChange(themeName); setOpenTheme(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${currentTheme === themeName ? "bg-blue-100 text-blue-900 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  {themeName === "darkBlue" && "כחול כהה"}
                  {themeName === "cloud" && "ענן"}
                  {themeName === "sky" && "שמיים"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}