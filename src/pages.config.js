/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AppLogin from './pages/AppLogin';
import Calendar from './pages/Calendar';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import DataAudit from './pages/DataAudit';
import DebtorReport from './pages/DebtorReport';
import DeduplicateRecords from './pages/DeduplicateRecords';
import Documents from './pages/Documents';
import Home from './pages/Home';
import Import from './pages/Import';
import LegalStatusMigration from './pages/LegalStatusMigration';
import LinkedRecords from './pages/LinkedRecords';
import Settings from './pages/Settings';
import ShareDashboard from './pages/ShareDashboard';
import SmartImport from './pages/SmartImport';
import StatusManagement from './pages/StatusManagement';
import StatusWorkflow from './pages/StatusWorkflow';
import SupplierManagement from './pages/SupplierManagement';
import Suppliers from './pages/Suppliers';
import Tasks from './pages/Tasks';
import TodoReminders from './pages/TodoReminders';
import UserManagement from './pages/UserManagement';
import WhatsAppChat from './pages/WhatsAppChat';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import app from './pages/_app';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AppLogin": AppLogin,
    "Calendar": Calendar,
    "Contacts": Contacts,
    "Dashboard": Dashboard,
    "DataAudit": DataAudit,
    "DebtorReport": DebtorReport,
    "DeduplicateRecords": DeduplicateRecords,
    "Documents": Documents,
    "Home": Home,
    "Import": Import,
    "LegalStatusMigration": LegalStatusMigration,
    "LinkedRecords": LinkedRecords,
    "Settings": Settings,
    "ShareDashboard": ShareDashboard,
    "SmartImport": SmartImport,
    "StatusManagement": StatusManagement,
    "StatusWorkflow": StatusWorkflow,
    "SupplierManagement": SupplierManagement,
    "Suppliers": Suppliers,
    "Tasks": Tasks,
    "TodoReminders": TodoReminders,
    "UserManagement": UserManagement,
    "WhatsAppChat": WhatsAppChat,
    "WhatsAppTemplates": WhatsAppTemplates,
    "_app": app,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};