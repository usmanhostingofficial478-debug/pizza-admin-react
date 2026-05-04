'use client'

import { useCallback, useEffect, useState } from 'react'

export type AdminSettings = {
  // Profile
  adminName: string
  storeName: string
  storeAddress: string
  storePhone: string
  currency: string

  // Order defaults
  defaultDeliveryFee: number

  // Notifications
  soundEnabled: boolean
  soundVolume: number         // 0–1
  browserNotifEnabled: boolean
  toastsEnabled: boolean
  titleFlashEnabled: boolean

  // UI preferences
  theme: 'dark' | 'dim'
  compactTables: boolean
  showStatsStrip: boolean
  defaultOrdersFilter: 'All' | 'Pending' | 'Processing' | 'Confirmed' | 'On the Way' | 'Delivered' | 'Cancelled'
  autoRefreshSec: number      // 0 = off
}

export const DEFAULT_SETTINGS: AdminSettings = {
  adminName: 'Admin',
  storeName: process.env.NEXT_PUBLIC_STORE_NAME    || 'Pizza Company',
  storeAddress: process.env.NEXT_PUBLIC_STORE_ADDRESS || 'Main Road, Okara, Punjab',
  storePhone: process.env.NEXT_PUBLIC_STORE_PHONE  || '+92 317 8457586',
  currency: process.env.NEXT_PUBLIC_CURRENCY || 'Rs.',

  defaultDeliveryFee: 100,

  soundEnabled: true,
  soundVolume: 0.6,
  browserNotifEnabled: true,
  toastsEnabled: true,
  titleFlashEnabled: true,

  theme: 'dark',
  compactTables: false,
  showStatsStrip: true,
  defaultOrdersFilter: 'All',
  autoRefreshSec: 0,
}

const KEY = 'pz_admin_settings_v1'

export function readSettings(): AdminSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch { return DEFAULT_SETTINGS }
}

export function writeSettings(s: Partial<AdminSettings>): AdminSettings {
  const current = readSettings()
  const merged = { ...current, ...s }
  try { localStorage.setItem(KEY, JSON.stringify(merged)) } catch {}
  // Emit a storage event within the current tab so hooks subscribe
  try { window.dispatchEvent(new CustomEvent('pz-settings-changed', { detail: merged })) } catch {}
  return merged
}

export function resetSettings(): AdminSettings {
  try { localStorage.removeItem(KEY) } catch {}
  try { window.dispatchEvent(new CustomEvent('pz-settings-changed', { detail: DEFAULT_SETTINGS })) } catch {}
  return DEFAULT_SETTINGS
}

/** React hook — live-updates across tabs/components */
export function useSettings() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setSettings(readSettings())
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as AdminSettings | undefined
      setSettings(detail ?? readSettings())
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSettings(readSettings())
    }
    window.addEventListener('pz-settings-changed', onChange as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('pz-settings-changed', onChange as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const update = useCallback((patch: Partial<AdminSettings>) => {
    const merged = writeSettings(patch)
    setSettings(merged)
    return merged
  }, [])

  const reset = useCallback(() => {
    const defaults = resetSettings()
    setSettings(defaults)
    return defaults
  }, [])

  return { settings, update, reset }
}
