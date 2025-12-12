import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/auth/AuthContext';
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
import { Users, Plus, Trash2, Power, PowerOff, AlertCircle, Shield, Eye } from "lucide-react";
import { toast } from 'sonner';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function UserManagementContent() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'viewer_password'
  });
  const [formError, setFormError] = useState('');

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
        username: userData.username,
        password_hash: passwordHash,
        role: userData.role,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appUsers'] });
      setIsAddDialogOpen(false);
      setNewUser({ username: '', password: '', role: 'viewer_password' });
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
      if (settings.length > 0) {
        return base44.entities.AppSettings.update(settings[0].id, {
          dashboard_public_enabled: enabled
        });
      } else {
        return base44.entities.AppSettings.create({
          dashboard_public_enabled: enabled
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('ההגדרה עודכנה');
    }
  });

  const handleCreateUser = () => {
    setFormError('');

    // Validation
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">טוען...</p>
        </div>
      </div>
    );
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="font-semibold text-slate-800">אפשר צפייה ללא סיסמה לדשבורד</p>
                <p className="text-sm text-slate-500 mt-1">
                  כאשר מופעל, כל אחד יכול לגשת לדשבורד ללא התחברות
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
                  <TableHead className="text-right font-bold">שם משתמש</TableHead>
                  <TableHead className="text-right font-bold">תפקיד</TableHead>
                  <TableHead className="text-right font-bold">סטטוס</TableHead>
                  <TableHead className="text-right font-bold">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
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
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActiveMutation.mutate({ 
                            id: user.id, 
                            is_active: !user.is_active 
                          })}
                          className="rounded-lg"
                          disabled={user.username === currentUser?.username}
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
                  שם משתמש (אנגלית בלבד)
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
                  סיסמה (6-10 תווים)
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
                    setNewUser({ username: '', password: '', role: 'viewer_password' });
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
      </div>
    </div>
  );
}

export default function UserManagement() {
  return (
    <ProtectedRoute allowedRoles={['admin']} pageName="UserManagement">
      <UserManagementContent />
    </ProtectedRoute>
  );
}