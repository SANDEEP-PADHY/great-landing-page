'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { PriceView, SlotId, SlotView } from '@/lib/contracts';
import { track } from '@/lib/tracking/client';

export type SheetLocation = 'hero' | 'sticky_bar' | 'pricing' | 'final' | 'claim_pill';

export type LiveSlot = SlotView & { open: boolean };

type Ctx = {
  now: number;
  price: PriceView;
  offerEndsMs: number;
  offerLive: boolean;
  salesOpen: boolean;
  slots: LiveSlot[];
  selectedId: SlotId | null;
  selected: LiveSlot | null;
  selectSlot: (id: SlotId, location: 'pricing' | 'sheet') => void;
  sheetOpen: boolean;
  sheetLocation: SheetLocation;
  openSheet: (location: SheetLocation) => void;
  closeSheet: () => void;
  markSlotClosed: (id: SlotId) => void;
};

const LandingCtx = createContext<Ctx | null>(null);

export function useLanding(): Ctx {
  const c = useContext(LandingCtx);
  if (!c) throw new Error('useLanding must be used inside <LandingProvider>');
  return c;
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function LandingProvider({
  slots: serverSlots,
  price,
  salesOpen,
  renderedAt,
  children,
}: {
  slots: SlotView[];
  price: PriceView;
  salesOpen: boolean;
  renderedAt: number;
  children: React.ReactNode;
}) {
  // Start from the server's timestamp so hydration matches, then jump to real time before paint.
  const [now, setNow] = useState(renderedAt);
  const [slotData, setSlotData] = useState<SlotView[]>(serverSlots);
  const [picked, setPicked] = useState<SlotId | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLocation, setSheetLocation] = useState<SheetLocation>('hero');

  useIsoLayoutEffect(() => {
    setNow(Date.now());
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ?slot=s8 preselects a slot (abandoned-cart email). Ignored if closed (handled by `selectedId`).
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('slot');
      if (q) setPicked(q as SlotId);
    } catch {
      /* ignore */
    }
  }, []);

  const slots: LiveSlot[] = useMemo(
    () => slotData.map((s) => ({ ...s, open: s.isOpen && Date.parse(s.startsAt) > now })),
    [slotData, now],
  );
  const firstOpen = slots.find((s) => s.open) ?? null;
  const pickedSlot = picked ? slots.find((s) => s.id === picked && s.open) : undefined;
  const selected = pickedSlot ?? firstOpen;
  const selectedId = selected ? selected.id : null;

  const selectSlot = useCallback(
    (id: SlotId, location: 'pricing' | 'sheet') => {
      const s = slots.find((x) => x.id === id);
      if (!s || !s.open) return;
      setPicked(id);
      track('slot_select', { slot_id: id, location });
    },
    [slots],
  );

  const openSheet = useCallback((location: SheetLocation) => {
    setSheetLocation(location);
    setSheetOpen(true);
  }, []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  // After a `slot_closed` error from the server: grey that slot out locally.
  const markSlotClosed = useCallback((id: SlotId) => {
    setSlotData((prev) => prev.map((s) => (s.id === id ? { ...s, isOpen: false } : s)));
  }, []);

  const offerEndsMs = Date.parse(price.offerEndsAt);
  const value: Ctx = {
    now,
    price,
    offerEndsMs,
    offerLive: price.isOffer && now <= offerEndsMs,
    salesOpen,
    slots,
    selectedId,
    selected,
    selectSlot,
    sheetOpen,
    sheetLocation,
    openSheet,
    closeSheet,
    markSlotClosed,
  };
  return <LandingCtx.Provider value={value}>{children}</LandingCtx.Provider>;
}
