import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Settings from './pages/Settings';
import StatusManagement from './pages/StatusManagement';
import Home from './pages/Home';
import UserManagement from './pages/UserManagement';
import app from './pages/_app';
import AppLogin from './pages/AppLogin';
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};