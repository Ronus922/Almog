import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { isManagerRole } from '@/components/utils/roles';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, Trash2, Power, PowerOff, AlertCircle, Shield, Eye, Copy, RefreshCw, Pencil, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import EditUserDialog from '@/components/users/EditUserDialog';

export default function UserManagement() {
  const { currentUser, loading } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    role: 'viewer_password'
  });
  const [formError, setFormError] = useState('');
  const [shareToken, setShareToken] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list('-created_date'),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const createUserMutation = useMutation({
    mutationFn: (userData) => {
      // Hash password
      const passwordHash = btoa(userData.password);
      return base44.entities.AppUser.create({
        first_name: userData.first_name,
        last_name: userData.last_name || '',
        username: userData.username,
        password_hash: passwordHash,
        role: userData.role,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
      setIsAddDialogOpen(false);
      setNewUser({ first_name: '', last_name: '', username: '', password: '', role: 'viewer_password' });
      setFormError('');
      toast.success('המשתמש נוצר בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה ביצירת המשתמש');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.AppUser.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
      toast.success('הסטטוס עודכן');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.entities.AppUser.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
      toast.success('המשתמש נמחק');
    }
  });

  const togglePublicAccessMutation = useMutation({
    mutationFn: async (enabled) => {
      let token = null;
      
      if (enabled) {
        // Generate new token
        token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      
      if (settings.length > 0) {
        return base44.entities.AppSettings.update(settings[0].id, {
          dashboard_public_enabled: enabled,
          dashboard_share_token: token,
          dashboard_share_created_at: enabled ? new Date().toISOString() : null
        });
      } else {
        return base44.entities.AppSettings.create({
          dashboard_public_enabled: enabled,
          dashboard_share_token: token,
          dashboard_share_created_at: enabled ? new Date().toISOString() : null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('ההגדרה עודכנה');
    }
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: async () => {
      const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      if (settings.length > 0) {
        return base44.entities.AppSettings.update(settings[0].id, {
          dashboard_share_token: newToken,
          dashboard_share_created_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('נוצר קישור חדש');
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, userData }) => {
      const updateData = {
        first_name: userData.first_name,
        last_name: userData.last_name || '',
        username: userData.username,
        role: userData.role,
        is_active: userData.is_active
      };
      
      // Only update password if provided
      if (userData.password) {
        updateData.password_hash = btoa(userData.password);
      }
      
      return base44.entities.AppUser.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast.success('המשתמש עודכן בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בעדכון המשתמש');
    }
  });

  const handleCreateUser = () => {
    setFormError('');

    // Validation
    if (!newUser.first_name.trim()) {
      setFormError('יש להזין שם פרטי');
      return;
    }

    if (!newUser.username.trim()) {
      setFormError('נא להזין שם משתמש');
      return;
    }

    const englishOnly = /^[A-Za-z0-9._-]+$/;
    if (!englishOnly.test(newUser.username)) {
      setFormError('שם משתמש חייב להיות באנגלית בלבד (אותיות, מספרים, . _ -)');
      return;
    }

    if (!newUser.password.trim()) {
      setFormError('נא להזין סיסמה');
      return;
    }

    const passwordPattern = /^[A-Za-z0-9]{6,10}$/;
    if (!passwordPattern.test(newUser.password)) {
      setFormError('סיסמה חייבת להיות 6-10 תווים (אותיות ומספרים בלבד)');
      return;
    }

    // Check if username already exists
    if (users.some(u => u.username === newUser.username)) {
      setFormError('שם משתמש כבר קיים');
      return;
    }

    createUserMutation.mutate(newUser);
  };

  const publicAccessEnabled = settings.length > 0 ? settings[0].dashboard_public_enabled : false;
  const currentToken = settings.length > 0 ? settings[0].dashboard_share_token : '';
  const shareUrl = currentToken ? `${window.location.origin}/share/dashboard/${currentToken}` : '';

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('הקישור הועתק');
    } catch (err) {
      toast.error('לא ניתן להעתיק, נסה שוב');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedUser = (userData) => {
    updateUserMutation.mutate({ id: editingUser.id, userData });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  if (!isManagerRole(currentUser)) {
    return <Navigate to={createPageUrl('Dashboard')} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ניהול משתמשים</h1>
            <p className="text-slate-600 mt-1">ניהול משתמשי המערכת והרשאות גישה</p>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Plus className="w-4 h-4 ml-2" />
            משתמש חדש
          </Button>
        </div>

        {/* Public Access Toggle */}
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader className="bg-gradient-to-l from-purple-50 to-white">
            <CardTitle className="flex items-center gap-3 text-right">
              <Eye className="w-5 h-5 text-purple-600" />
              צפייה ציבורית
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="font-semibold text-slate-800">אפשר צפייה ללא סיסמה לדשבורד</p>
                <p className="text-sm text-slate-500 mt-1">
                  יצירת קישור שיתוף ייחודי לצפייה בלבד
                </p>
              </div>
              <Button
                variant={publicAccessEnabled ? "default" : "outline"}
                onClick={() => togglePublicAccessMutation.mutate(!publicAccessEnabled)}
                className={`rounded-xl ${publicAccessEnabled ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {publicAccessEnabled ? 'מופעל' : 'כבוי'}
              </Button>
            </div>

            {publicAccessEnabled && shareUrl && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <Label className="text-sm font-bold text-slate-700 block text-right">
                  קישור צפייה לדשבורד
                </Label>
                <div className="flex gap-2" dir="ltr">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="h-11 rounded-lg text-left flex-1 bg-white"
                    dir="ltr"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyShareLink}
                    className="h-11 w-11 rounded-lg"
                    title="העתק קישור"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => regenerateTokenMutation.mutate()}
                    className="h-11 w-11 rounded-lg"
                    title="צור קישור חדש"
                    disabled={regenerateTokenMutation.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerateTokenMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <p className="text-xs text-slate-600 text-right">
                  שתף קישור זה עם אנשים שאתה רוצה שיוכלו לצפות בדשבורד ללא התחברות
                </p>
              </div>
            )}

            {!publicAccessEnabled && (
              <Alert className="bg-slate-50 border-slate-200">
                <AlertDescription className="text-slate-600 text-sm text-right">
                  הצפייה ללא סיסמה כבויה. הפעל כדי ליצור קישור שיתוף.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader className="bg-gradient-to-l from-white to-slate-50">
            <CardTitle className="flex items-center gap-3 text-right">
              <Users className="w-5 h-5 text-blue-600" />
              משתמשי המערכת ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-right font-bold">שם פרטי</TableHead>
                  <TableHead className="text-right font-bold">שם משפחה</TableHead>
                  <TableHead className="text-right font-bold">שם משתמש</TableHead>
                  <TableHead className="text-right font-bold">תפקיד</TableHead>
                  <TableHead className="text-right font-bold">סטטוס</TableHead>
                  <TableHead className="text-right font-bold">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow 
                    key={user.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleEditUser(user)}
                  >
                    <TableCell className="font-medium">
                      {user.first_name || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {user.last_name || '-'}
                    </TableCell>
                    <TableCell className="font-medium" dir="ltr" style={{ textAlign: 'right' }}>
                      {user.username}
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <Shield className="w-3 h-3 ml-1" />
                          מנהל
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          <Eye className="w-3 h-3 ml-1" />
                          צפייה
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">פעיל</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">מושבת</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(user)}
                          className="rounded-lg"
                          title="ערוך"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActiveMutation.mutate({ 
                            id: user.id, 
                            is_active: !user.is_active 
                          })}
                          className="rounded-lg"
                          disabled={user.username === currentUser?.username}
                          title={user.is_active ? "השבת" : "הפעל"}
                        >
                          {user.is_active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`האם למחוק את המשתמש ${user.username}?`)) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                          className="rounded-lg text-red-600 hover:bg-red-50"
                          disabled={user.username === currentUser?.username}
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="rounded-2xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-2xl font-bold">הוספת משתמש חדש</DialogTitle>
            </DialogHeader>

            {formError && (
              <Alert className="bg-red-50 border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800 text-sm font-medium">
                    {formError}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 block">
                  שם פרטי <span className="text-red-600">*</span>
                </Label>
                <Input
                  placeholder="שם פרטי"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  className="h-11 rounded-xl text-right"
                  dir="rtl"
                />
              </div>

              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 block">
                  שם משפחה
                </Label>
                <Input
                  placeholder="שם משפחה (אופציונלי)"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  className="h-11 rounded-xl text-right"
                  dir="rtl"
                />
              </div>

              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 block">
                  שם משתמש (אנגלית בלבד) <span className="text-red-600">*</span>
                </Label>
                <Input
                  placeholder="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="h-11 rounded-xl text-left"
                  dir="ltr"
                />
              </div>

              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 block">
                  סיסמה (6-10 תווים) <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="******"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="h-11 rounded-xl text-left"
                  dir="ltr"
                />
              </div>

              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 block">תפקיד</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger className="h-11 rounded-xl text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">מנהל</SelectItem>
                    <SelectItem value="viewer_password">צפייה עם סיסמה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setNewUser({ first_name: '', last_name: '', username: '', password: '', role: 'viewer_password' });
                    setFormError('');
                  }}
                  className="flex-1 rounded-xl"
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  {createUserMutation.isPending ? 'יוצר...' : 'צור משתמש'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <EditUserDialog
          user={editingUser}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingUser(null);
          }}
          onSave={handleSaveEditedUser}
          existingUsernames={users.map(u => u.username)}
        />
      </div>
    </div>
  );
}