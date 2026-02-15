/**
 * Seed data for the Kyoto March 2026 trip.
 * Matches the mockup entity graph exactly.
 */

import { Place, Experience, Trip } from "./types";

export const SEED_TRIP: Trip = {
  id: "trip-kyoto-2026",
  name: "Kyoto · March 2026",
  dateRange: { start: "2026-03-15", end: "2026-03-19" },
  timezone: "Asia/Tokyo",
  createdAt: "2026-01-10T09:00:00Z",
  createdBy: "user-kai",
  collaborators: ["user-kai", "user-mika"],
};

// ─── Places ───

const places: Place[] = [
  { id: "p-kyoto", type: "place", tripId: SEED_TRIP.id, name: "Kyoto", parentId: null, coords: null, sortOrder: 0, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "p-fushimi", type: "place", tripId: SEED_TRIP.id, name: "Fushimi Inari", parentId: "p-kyoto", coords: { lat: 34.9671, lng: 135.7727 }, sortOrder: 0, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "p-arashiyama", type: "place", tripId: SEED_TRIP.id, name: "Arashiyama", parentId: "p-kyoto", coords: { lat: 35.0094, lng: 135.6670 }, sortOrder: 1, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "p-nishiki", type: "place", tripId: SEED_TRIP.id, name: "Nishiki Market", parentId: "p-kyoto", coords: { lat: 35.0050, lng: 135.7640 }, sortOrder: 2, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "p-kiyomizu", type: "place", tripId: SEED_TRIP.id, name: "Kiyomizu-dera", parentId: "p-kyoto", coords: { lat: 34.9948, lng: 135.7850 }, sortOrder: 3, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "p-sake-venue", type: "place", tripId: SEED_TRIP.id, name: "Sake tasting venue", parentId: "p-kyoto", coords: null, sortOrder: 4, createdAt: "2026-01-12T09:00:00Z", createdBy: "user-mika" },
  { id: "p-pottery-place", type: "place", tripId: SEED_TRIP.id, name: "Pottery studio", parentId: "p-kyoto", coords: null, sortOrder: 5, createdAt: "2026-01-12T09:00:00Z", createdBy: "user-mika" },
  { id: "p-osaka", type: "place", tripId: SEED_TRIP.id, name: "Osaka", parentId: null, coords: null, sortOrder: 1, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "p-dotonbori", type: "place", tripId: SEED_TRIP.id, name: "Dōtonbori", parentId: "p-osaka", coords: { lat: 34.6687, lng: 135.5013 }, sortOrder: 0, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
];

// ─── Experiences ───

const tz = "Asia/Tokyo";

const experiences: Experience[] = [
  // Root
  { id: "e-trip", type: "experience", tripId: SEED_TRIP.id, name: "Kyoto March 2026", parentId: null, placeIds: [], schedule: null, amount: null, currency: "JPY", sortOrder: 0, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },

  // Structural containers
  { id: "e-cultural-pkg", type: "experience", tripId: SEED_TRIP.id, name: "2-day cultural package", parentId: "e-trip", placeIds: [], schedule: null, amount: 12000, currency: "JPY", sortOrder: 0, createdAt: "2026-01-11T09:00:00Z", createdBy: "user-mika" },
  { id: "e-transport", type: "experience", tripId: SEED_TRIP.id, name: "Transport", parentId: "e-trip", placeIds: [], schedule: null, amount: null, currency: "JPY", sortOrder: 1, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-accommodation", type: "experience", tripId: SEED_TRIP.id, name: "Accommodation", parentId: "e-trip", placeIds: [], schedule: null, amount: null, currency: "JPY", sortOrder: 2, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },

  // Scheduled experiences
  { id: "e-nishiki-tour", type: "experience", tripId: SEED_TRIP.id, name: "Nishiki Market food tour", parentId: "e-trip", placeIds: ["p-nishiki"], schedule: { date: "2026-03-15", time: "11:00 am", timezone: tz }, amount: null, currency: "JPY", sortOrder: 3, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-knife-shop", type: "experience", tripId: SEED_TRIP.id, name: "Knife shopping", parentId: "e-trip", placeIds: ["p-nishiki"], schedule: { date: "2026-03-15", time: "2:00 pm", timezone: tz }, amount: null, currency: "JPY", sortOrder: 4, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-fushimi-hike", type: "experience", tripId: SEED_TRIP.id, name: "Fushimi Inari sunrise hike", parentId: "e-trip", placeIds: ["p-fushimi"], schedule: { date: "2026-03-16", time: "6:00 am", timezone: tz }, amount: null, currency: "JPY", sortOrder: 5, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-kiyomizu-walk", type: "experience", tripId: SEED_TRIP.id, name: "Kiyomizu-dera & Ninenzaka", parentId: "e-trip", placeIds: ["p-kiyomizu"], schedule: { date: "2026-03-16", time: "2:00 pm", timezone: tz }, amount: null, currency: "JPY", sortOrder: 6, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-sake-evening", type: "experience", tripId: SEED_TRIP.id, name: "Sake district evening", parentId: "e-cultural-pkg", placeIds: ["p-sake-venue"], schedule: { date: "2026-03-16", time: "5:00 pm", timezone: tz }, amount: null, currency: "JPY", sortOrder: 0, createdAt: "2026-01-12T09:00:00Z", createdBy: "user-mika" },
  { id: "e-bamboo", type: "experience", tripId: SEED_TRIP.id, name: "Bamboo grove & Tenryū-ji", parentId: "e-trip", placeIds: ["p-arashiyama"], schedule: { date: "2026-03-17", time: "8:40 am", timezone: tz }, amount: null, currency: "JPY", sortOrder: 7, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-pottery-class", type: "experience", tripId: SEED_TRIP.id, name: "Pottery workshop", parentId: "e-cultural-pkg", placeIds: ["p-pottery-place"], schedule: { date: "2026-03-17", time: "2:00 pm", timezone: tz }, amount: null, currency: "JPY", sortOrder: 1, createdAt: "2026-01-12T09:00:00Z", createdBy: "user-mika" },
  { id: "e-osaka-day", type: "experience", tripId: SEED_TRIP.id, name: "Dōtonbori street food", parentId: "e-trip", placeIds: ["p-dotonbori"], schedule: { date: "2026-03-18", time: "10:00 am", timezone: tz }, amount: null, currency: "JPY", sortOrder: 8, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },

  // Unscheduled
  { id: "e-tea-ceremony", type: "experience", tripId: SEED_TRIP.id, name: "Tea ceremony", parentId: "e-trip", placeIds: [], schedule: null, amount: null, currency: "JPY", sortOrder: 9, createdAt: "2026-01-14T09:00:00Z", createdBy: "user-mika" },
  { id: "e-nara-trip", type: "experience", tripId: SEED_TRIP.id, name: "Nara deer park", parentId: "e-trip", placeIds: [], schedule: null, amount: null, currency: "JPY", sortOrder: 10, createdAt: "2026-01-14T09:00:00Z", createdBy: "user-mika" },

  // Expenses (leaf nodes with amounts)
  { id: "e-jr-pass", type: "experience", tripId: SEED_TRIP.id, name: "JR Pass (7-day)", parentId: "e-transport", placeIds: [], schedule: null, amount: 29650, currency: "JPY", sortOrder: 0, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-ryokan", type: "experience", tripId: SEED_TRIP.id, name: "Ryokan (2 nights)", parentId: "e-accommodation", placeIds: [], schedule: null, amount: 48000, currency: "JPY", sortOrder: 0, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-food-tour-cost", type: "experience", tripId: SEED_TRIP.id, name: "Street food tasting", parentId: "e-nishiki-tour", placeIds: [], schedule: null, amount: 3200, currency: "JPY", sortOrder: 0, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
  { id: "e-knife-cost", type: "experience", tripId: SEED_TRIP.id, name: "Kitchen knife", parentId: "e-knife-shop", placeIds: [], schedule: null, amount: 15000, currency: "JPY", sortOrder: 0, createdAt: "2026-01-11T09:00:00Z", createdBy: "user-kai" },
  { id: "e-fox-udon", type: "experience", tripId: SEED_TRIP.id, name: "Fox udon at hilltop", parentId: "e-fushimi-hike", placeIds: [], schedule: null, amount: 850, currency: "JPY", sortOrder: 0, createdAt: "2026-01-11T09:00:00Z", createdBy: "user-kai" },
  { id: "e-tenryuji-entry", type: "experience", tripId: SEED_TRIP.id, name: "Tenryū-ji entry", parentId: "e-bamboo", placeIds: [], schedule: null, amount: 500, currency: "JPY", sortOrder: 0, createdAt: "2026-01-11T09:00:00Z", createdBy: "user-kai" },
  { id: "e-kiyomizu-entry", type: "experience", tripId: SEED_TRIP.id, name: "Kiyomizu-dera entry", parentId: "e-kiyomizu-walk", placeIds: [], schedule: null, amount: 400, currency: "JPY", sortOrder: 0, createdAt: "2026-01-11T09:00:00Z", createdBy: "user-kai" },
  { id: "e-riverside-lunch", type: "experience", tripId: SEED_TRIP.id, name: "Riverside café lunch", parentId: "e-bamboo", placeIds: [], schedule: null, amount: 1800, currency: "JPY", sortOrder: 1, createdAt: "2026-01-11T09:00:00Z", createdBy: "user-kai" },
  { id: "e-travel-insurance", type: "experience", tripId: SEED_TRIP.id, name: "Travel insurance", parentId: "e-transport", placeIds: [], schedule: null, amount: 120, currency: "AUD", sortOrder: 1, createdAt: "2026-01-10T09:00:00Z", createdBy: "user-kai" },
];

// ─── Seed document content (TipTap JSON) ───

function chip(entityId: string) {
  return { type: "entityChip", attrs: { entityId } };
}

function text(content: string) {
  return { type: "text", text: content };
}

function p(...content: any[]) {
  return { type: "paragraph", content };
}

export const SEED_DOCUMENT = {
  type: "doc",
  content: [
    p(text("We land at KIX around 2pm on the 15th. After getting the "), chip("e-jr-pass"), text(" at the airport, head straight to Kyoto Station. Should be at the "), chip("e-ryokan"), text(" by 4pm.")),
    p(text("First stop: "), chip("e-nishiki-tour"), text(" — need to book before 3pm, slots fill up in spring. The pickle shops at the west end of "), chip("p-nishiki"), text(" are the best. Budget "), chip("e-food-tour-cost"), text(" for the tasting.")),
    p(chip("e-fushimi-hike"), text(" needs a pre-dawn start — the upper trails past the main shrine at "), chip("p-fushimi"), text(" are nearly empty before 7am. Bring a headlamp. Grab "), chip("e-fox-udon"), text(" at the hilltop.")),
    p(text("Afternoon: "), chip("e-kiyomizu-walk"), text(". The walk down through Ninenzaka from "), chip("p-kiyomizu"), text(" is the highlight — traditional merchant streets.")),
    p(text("Evening: "), chip("e-sake-evening"), text(" at Fushimi breweries — book in advance. This plus "), chip("e-pottery-class"), text(" are covered by the "), chip("e-cultural-pkg"), text(".")),
    p(chip("e-bamboo"), text(" at "), chip("p-arashiyama"), text(" — grove gets impossibly crowded after 10am. Earliest train ~8:40. Grab "), chip("e-riverside-lunch"), text(" at the river.")),
    p(text("Day 4 is flexible — thinking "), chip("e-osaka-day"), text("? Only 15 min Shinkansen to "), chip("p-dotonbori"), text(". Or Philosopher's Path if cherry blossoms are early.")),
    p(text("Still to figure out: "), chip("e-tea-ceremony"), text(" (Urasenke school?), buffer day, "), chip("e-nara-trip"), text(" as half-day side trip.")),
  ],
};

// ─── Export all seed entities ───

export const SEED_ENTITIES = [...places, ...experiences];
