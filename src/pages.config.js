import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Settings from './pages/Settings';
import StatusManagement from './pages/StatusManagement';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Import": Import,
    "Settings": Settings,
    "StatusManagement": StatusManagement,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};