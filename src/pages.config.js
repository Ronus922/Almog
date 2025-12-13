import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Settings from './pages/Settings';
import StatusManagement from './pages/StatusManagement';
import Home from './pages/Home';
import UserManagement from './pages/UserManagement';
import app from './pages/_app';
import AppLogin from './pages/AppLogin';
import ShareDashboard from './pages/ShareDashboard';
import LegalStatusMigration from './pages/LegalStatusMigration';
import LinkedRecords from './pages/LinkedRecords';
import StatusWorkflow from './pages/StatusWorkflow';
import DebtorReport from './pages/DebtorReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Import": Import,
    "Settings": Settings,
    "StatusManagement": StatusManagement,
    "Home": Home,
    "UserManagement": UserManagement,
    "_app": app,
    "AppLogin": AppLogin,
    "ShareDashboard": ShareDashboard,
    "LegalStatusMigration": LegalStatusMigration,
    "LinkedRecords": LinkedRecords,
    "StatusWorkflow": StatusWorkflow,
    "DebtorReport": DebtorReport,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};