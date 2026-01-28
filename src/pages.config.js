import AppLogin from './pages/AppLogin';
import Dashboard from './pages/Dashboard';
import DataAudit from './pages/DataAudit';
import DebtorReport from './pages/DebtorReport';
import DeduplicateRecords from './pages/DeduplicateRecords';
import Home from './pages/Home';
import Import from './pages/Import';
import LegalStatusMigration from './pages/LegalStatusMigration';
import LinkedRecords from './pages/LinkedRecords';
import Settings from './pages/Settings';
import ShareDashboard from './pages/ShareDashboard';
import SmartImport from './pages/SmartImport';
import StatusManagement from './pages/StatusManagement';
import StatusWorkflow from './pages/StatusWorkflow';
import UserManagement from './pages/UserManagement';
import app from './pages/_app';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AppLogin": AppLogin,
    "Dashboard": Dashboard,
    "DataAudit": DataAudit,
    "DebtorReport": DebtorReport,
    "DeduplicateRecords": DeduplicateRecords,
    "Home": Home,
    "Import": Import,
    "LegalStatusMigration": LegalStatusMigration,
    "LinkedRecords": LinkedRecords,
    "Settings": Settings,
    "ShareDashboard": ShareDashboard,
    "SmartImport": SmartImport,
    "StatusManagement": StatusManagement,
    "StatusWorkflow": StatusWorkflow,
    "UserManagement": UserManagement,
    "_app": app,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};