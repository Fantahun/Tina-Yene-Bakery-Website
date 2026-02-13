"use client";

import { useState } from "react";
import { Save, Clock, DollarSign, MapPin, Plus, Trash2 } from "lucide-react";
import { siteSettings, pickupLocations } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    cutoff_time: siteSettings.cutoff_time,
    delivery_fee: siteSettings.delivery_fee,
    min_order_delivery: siteSettings.min_order_delivery,
    store_phone: siteSettings.store_phone,
    store_email: siteSettings.store_email,
  });

  const [locations, setLocations] = useState(pickupLocations);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // In production, this would call an API to save settings
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLocation = () => {
    const newLocation = {
      id: Math.max(...locations.map((l) => l.id)) + 1,
      name: "New Location",
      address: "Enter address",
      is_active: true,
    };
    setLocations([...locations, newLocation]);
  };

  const handleRemoveLocation = (id: number) => {
    setLocations(locations.filter((l) => l.id !== id));
    toast.success("Location removed");
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your bakery operations
        </p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure cutoff times and delivery options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="cutoff_time"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Same-Day Cutoff Time
                </Label>
                <Input
                  id="cutoff_time"
                  type="time"
                  value={settings.cutoff_time}
                  onChange={(e) =>
                    setSettings({ ...settings, cutoff_time: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Orders placed after this time will be scheduled for the next
                  day
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="delivery_fee"
                  className="flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Delivery Fee ($)
                </Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.delivery_fee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      delivery_fee: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_order" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Minimum Order for Delivery ($)
                </Label>
                <Input
                  id="min_order"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.min_order_delivery}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      min_order_delivery: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store_phone">Store Phone</Label>
                <Input
                  id="store_phone"
                  type="tel"
                  value={settings.store_phone}
                  onChange={(e) =>
                    setSettings({ ...settings, store_phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_email">Store Email</Label>
                <Input
                  id="store_email"
                  type="email"
                  value={settings.store_email}
                  onChange={(e) =>
                    setSettings({ ...settings, store_email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pickup Locations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Pickup Locations
                </CardTitle>
                <CardDescription>Manage store pickup locations</CardDescription>
              </div>
              <Button onClick={handleAddLocation} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locations.map((location, index) => (
                <div
                  key={location.id}
                  className="flex items-start gap-4 rounded-lg border border-border p-4"
                >
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`location_name_${location.id}`}>
                        Location Name
                      </Label>
                      <Input
                        id={`location_name_${location.id}`}
                        value={location.name}
                        onChange={(e) => {
                          const updated = [...locations];
                          updated[index].name = e.target.value;
                          setLocations(updated);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`location_address_${location.id}`}>
                        Address
                      </Label>
                      <Input
                        id={`location_address_${location.id}`}
                        value={location.address}
                        onChange={(e) => {
                          const updated = [...locations];
                          updated[index].address = e.target.value;
                          setLocations(updated);
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`location_active_${location.id}`}
                          checked={location.is_active}
                          onCheckedChange={(checked) => {
                            const updated = [...locations];
                            updated[index].is_active = checked;
                            setLocations(updated);
                          }}
                        />
                        <Label htmlFor={`location_active_${location.id}`}>
                          Active
                        </Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLocation(location.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Locations"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SMS & Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure email and SMS notifications (requires Twilio/SendGrid
              setup)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                To enable automated SMS and email notifications:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>We will configure Twilio credentials for SMS</li>
                <li>We will Configure SendGrid or similar for email</li>
                <li>
                  We will Set up webhook handlers for order status updates
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
