import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useForm } from "@/hooks/useForm";
import { fetchNotificationPreferences, saveNotificationPreferences } from "@/services/notificationService";
import { useAsync } from "@/hooks/useAsync";
import { required, isEmail } from "@/utils/validators";

export default function Profile() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const { values, errors, setField, blurField, validateAll } = useForm(
    { name: user?.name ?? "", email: user?.email ?? "" },
    { name: [required("Name")], email: [required("Email"), isEmail] }
  );
  const preferencesQuery = useAsync(fetchNotificationPreferences, []);
  const [preferences, setPreferences] = useState({ emailNotifications: true, operationEmails: true, lowStockEmails: true });

  const updatePreference = async (key: keyof typeof preferences, value: boolean) => {
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      await saveNotificationPreferences(next);
    } catch {
      setPreferences(previous);
      showToast("Couldn't save those preferences. Please try again.", "error");
    }
  };

  useEffect(() => {
    if (preferencesQuery.data) setPreferences(preferencesQuery.data);
  }, [preferencesQuery.data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    // No backend endpoint for profile updates yet — this simulates the save
    // so the form's states (loading / validation / success) are demoable.
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    showToast("Profile updated.", "success");
  }

  return (
    <AppShell title="My Profile">
      <div className="max-w-lg space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-icon-container font-semibold text-icon-blue">{user?.avatarInitials}</div>
            <div>
              <p className="font-medium text-ink-900">{user?.name}</p>
              <p className="text-sm text-steel-500">{user?.role}</p>
            </div>
          </div>
          <form onSubmit={handleSave} noValidate className="space-y-4">
            <Input label="Full name" value={values.name} error={errors.name} onChange={(e) => setField("name", e.target.value)} onBlur={() => blurField("name")} />
            <Input label="Email" type="email" value={values.email} error={errors.email} onChange={(e) => setField("email", e.target.value)} onBlur={() => blurField("email")} />
            <Button type="submit" isLoading={saving}>
              Save changes
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <p className="text-sm font-medium text-ink-900">Notification preferences</p>
            <p className="text-sm text-steel-500">Choose how you want to hear about inventory changes.</p>
          </div>
          <div className="space-y-3">
            <Switch
              label="Email notifications"
              description="Allow StockSense to send account notifications"
              checked={preferences.emailNotifications}
              onChange={(checked) => void updatePreference("emailNotifications", checked)}
            />
            <Switch
              label="Operation notifications"
              description="Receipts, deliveries, transfers and adjustments"
              checked={preferences.operationEmails}
              onChange={(checked) => void updatePreference("operationEmails", checked)}
            />
            <Switch
              label="Low-stock alerts"
              description="Email me when stock hits or drops below reorder points"
              checked={preferences.lowStockEmails}
              onChange={(checked) => void updatePreference("lowStockEmails", checked)}
            />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900">Log out</p>
            <p className="text-sm text-steel-500">You'll need to log in again to access StockSense.</p>
          </div>
          <Button variant="danger" onClick={logout}>
            Logout
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
