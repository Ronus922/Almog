import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Document service definition - inline for now
window.documentService = {
  async createFolder(name, parentFolderId = null) {
    return (await import('@/api/base44Client')).base44.entities.DocumentFolder.create({
      name,
      parent_folder_id: parentFolderId || null,
      visibility_mode: 'all_users',
    });
  },
  
  async renameFolder(folderId, newName) {
    return (await import('@/api/base44Client')).base44.entities.DocumentFolder.update(folderId, {
      name: newName,
    });
  },
  
  async moveFolder(folderId, newParentId = null) {
    if (folderId === newParentId) {
      throw new Error('לא ניתן להעביר תיקייה לתוך עצמה');
    }
    if (newParentId) {
      const isDescendant = await this.isFolderDescendant(newParentId, folderId);
      if (isDescendant) {
        throw new Error('לא ניתן להעביר תיקייה לתוך אחד מתיקיותיה');
      }
    }
    return (await import('@/api/base44Client')).base44.entities.DocumentFolder.update(folderId, {
      parent_folder_id: newParentId || null,
    });
  },
  
  async deleteFolder(folderId) {
    return (await import('@/api/base44Client')).base44.entities.DocumentFolder.delete(folderId);
  },
  
  async listFolders(parentFolderId = null) {
    const all = await (await import('@/api/base44Client')).base44.entities.DocumentFolder.list();
    return all.filter(f => {
      if (parentFolderId === null) {
        return !f.parent_folder_id;
      }
      return f.parent_folder_id === parentFolderId;
    });
  },
  
  async isFolderDescendant(potentialDescendantId, parentId) {
    const folder = await (await import('@/api/base44Client')).base44.entities.DocumentFolder.get(potentialDescendantId);
    if (!folder.parent_folder_id) {
      return false;
    }
    if (folder.parent_folder_id === parentId) {
      return true;
    }
    return this.isFolderDescendant(folder.parent_folder_id, parentId);
  },
  
  async uploadFile(file, folderId = null) {
    if (!file) throw new Error('לא בחרת קובץ');
    const base44 = (await import('@/api/base44Client')).base44;
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    return base44.entities.DocumentFile.create({
      folder_id: folderId || null,
      title: file.name.split('.')[0],
      original_file_name: file.name,
      file_url: uploadResult.file_url,
      storage_key: uploadResult.file_url,
      file_extension: file.name.split('.').pop(),
      mime_type: file.type,
      file_size_bytes: file.size,
      file_category: this.getFileCategory(file.type),
    });
  },
  
  async uploadMultipleFiles(files, folderId = null) {
    const results = [];
    const errors = [];
    for (const file of files) {
      try {
        const result = await this.uploadFile(file, folderId);
        results.push(result);
      } catch (error) {
        errors.push({ fileName: file.name, error: error.message });
      }
    }
    return { results, errors };
  },
  
  async renameFile(fileId, newTitle) {
    return (await import('@/api/base44Client')).base44.entities.DocumentFile.update(fileId, {
      title: newTitle,
    });
  },
  
  async moveFile(fileId, newFolderId = null) {
    return (await import('@/api/base44Client')).base44.entities.DocumentFile.update(fileId, {
      folder_id: newFolderId || null,
    });
  },
  
  async deleteFile(fileId) {
    return (await import('@/api/base44Client')).base44.entities.DocumentFile.delete(fileId);
  },
  
  async listFiles(folderId = null) {
    const all = await (await import('@/api/base44Client')).base44.entities.DocumentFile.list();
    return all.filter(f => {
      if (folderId === null) {
        return !f.folder_id;
      }
      return f.folder_id === folderId;
    });
  },
  
  getFileCategory(mimeType) {
    if (!mimeType) return 'other';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar')) return 'archive';
    if (mimeType.startsWith('text/')) return 'document';
    return 'other';
  },
  
  getFileSizeDisplay(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIdx = 0;
    while (size >= 1024 && unitIdx < units.length - 1) {
      size /= 1024;
      unitIdx++;
    }
    return `${size.toFixed(1)} ${units[unitIdx]}`;
  },
  
  getFileIcon(fileCategory) {
    const icons = {
      image: '🖼️',
      pdf: '📄',
      audio: '🎵',
      video: '🎬',
      document: '📝',
      spreadsheet: '📊',
      presentation: '📽️',
      archive: '📦',
      other: '📎',
    };
    return icons[fileCategory] || '📎';
  },
  
  canPreviewFile(fileCategory) {
    return ['image', 'pdf', 'audio', 'video', 'document'].includes(fileCategory);
  },
};

import Tasks from "./pages/Tasks.jsx";
import InternalChat from "./pages/InternalChat.jsx";
import TasksProPage from "./pages/TasksProPage.jsx";
import WhatsAppTemplates from "./pages/WhatsAppTemplates";
import Contacts from "./pages/Contacts.jsx";
import WhatsAppChat from "./pages/WhatsAppChat.jsx";
import Calendar from "./pages/Calendar.jsx";
import Documents from "./pages/Documents.jsx";
import SupplierManagement from "./pages/SupplierManagement.jsx";
import TodoReminders from "./pages/TodoReminders.jsx";
import TaskAnalyticsDashboard from "./pages/TaskAnalyticsDashboard.jsx";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Tasks" element={<LayoutWrapper currentPageName="Tasks"><Tasks /></LayoutWrapper>} />
      <Route path="/WhatsAppTemplates" element={<LayoutWrapper currentPageName="WhatsAppTemplates"><WhatsAppTemplates /></LayoutWrapper>} />
      <Route path="/Contacts" element={<LayoutWrapper currentPageName="Contacts"><Contacts /></LayoutWrapper>} />
      <Route path="/WhatsAppChat" element={<LayoutWrapper currentPageName="WhatsAppChat"><WhatsAppChat /></LayoutWrapper>} />
      <Route path="/Calendar" element={<LayoutWrapper currentPageName="Calendar"><Calendar /></LayoutWrapper>} />
      <Route path="/Documents" element={<LayoutWrapper currentPageName="Documents"><Documents /></LayoutWrapper>} />
      <Route path="/SupplierManagement" element={<LayoutWrapper currentPageName="SupplierManagement"><SupplierManagement /></LayoutWrapper>} />
      <Route path="/TodoReminders" element={<LayoutWrapper currentPageName="TodoReminders"><TodoReminders /></LayoutWrapper>} />
      <Route path="/TasksPro" element={<LayoutWrapper currentPageName="TasksPro"><TasksProPage /></LayoutWrapper>} />
      <Route path="/InternalChat" element={<LayoutWrapper currentPageName="InternalChat"><InternalChat /></LayoutWrapper>} />
      <Route path="/TaskAnalyticsDashboard" element={<LayoutWrapper currentPageName="TaskAnalyticsDashboard"><TaskAnalyticsDashboard /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App