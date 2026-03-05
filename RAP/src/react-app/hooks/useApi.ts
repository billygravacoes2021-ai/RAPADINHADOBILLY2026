import { useState, useEffect, useCallback } from "react";

export interface Prize {
  id: number;
  name: string;
  emoji: string;
  image_url: string | null;
}

export interface Participant {
  id: number;
  name: string;
  phone: string;
  prize_won: string | null;
  is_winner: number;
  created_at: string;
}

export interface Settings {
  marquee_text: string;
  win_chance: string;
  whatsapp_link: string;
  theme: string;
  admin_password: string;
  marquee_speed: string;
  bg_emojis: string;
  app_name: string;
  app_subtitle: string;
  app_emoji: string;
  instagram_link: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (key: string, value: string) => {
    await fetch(`/api/settings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
}

export function usePrizes() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrizes = useCallback(async () => {
    try {
      const res = await fetch("/api/prizes");
      const data = await res.json();
      setPrizes(data);
    } catch (err) {
      console.error("Failed to fetch prizes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  const addPrize = async (name: string, emoji: string, imageUrl?: string) => {
    const res = await fetch("/api/prizes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, emoji, image_url: imageUrl }),
    });
    const newPrize = await res.json();
    setPrizes((prev) => [newPrize, ...prev]);
    return newPrize;
  };

  const deletePrize = async (id: number) => {
    await fetch(`/api/prizes/${id}`, { method: "DELETE" });
    setPrizes((prev) => prev.filter((p) => p.id !== id));
  };

  return { prizes, loading, addPrize, deletePrize, refetch: fetchPrizes };
}

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch("/api/participants");
      const data = await res.json();
      setParticipants(data);
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const addParticipant = async (name: string, phone: string, prizeWon?: string, isWinner?: boolean) => {
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, prize_won: prizeWon, is_winner: isWinner }),
    });
    const newParticipant = await res.json();
    setParticipants((prev) => [newParticipant, ...prev]);
    return newParticipant;
  };

  const deleteParticipant = async (id: number) => {
    await fetch(`/api/participants/${id}`, { method: "DELETE" });
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const deleteAllParticipants = async () => {
    await fetch("/api/participants", { method: "DELETE" });
    setParticipants([]);
  };

  return { participants, loading, addParticipant, deleteParticipant, deleteAllParticipants, refetch: fetchParticipants };
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  return data.url;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  return data.success;
}

export async function checkPhoneExists(phone: string): Promise<boolean> {
  const normalizedPhone = phone.replace(/\D/g, "");
  const res = await fetch(`/api/participants/check/${normalizedPhone}`);
  const data = await res.json();
  return data.exists;
}
