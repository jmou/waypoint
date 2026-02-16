import type { Context } from "@netlify/functions";

const COLORS = [
  "#e57373",
  "#f06292",
  "#ba68c8",
  "#9575cd",
  "#7986cb",
  "#64b5f6",
  "#4fc3f7",
  "#4dd0e1",
  "#4db6ac",
  "#81c784",
  "#aed581",
  "#dce775",
  "#fff176",
  "#ffd54f",
  "#ffb74d",
  "#ff8a65",
];

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomName(): string {
  const adjectives = ["Happy", "Clever", "Swift", "Brave", "Calm"];
  const nouns = ["Panda", "Eagle", "Fox", "Owl", "Wolf"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiSecret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!apiSecret) {
    return new Response("LIVEBLOCKS_SECRET_KEY not configured", {
      status: 500,
    });
  }

  // Request a session token from Liveblocks
  const response = await fetch("https://api.liveblocks.io/v2/rooms/waypoint-kyoto/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: `user-${Math.random().toString(36).slice(2, 9)}`,
      userInfo: {
        name: randomName(),
        color: randomColor(),
      },
    }),
  });

  if (!response.ok) {
    return new Response("Failed to authorize with Liveblocks", {
      status: response.status,
    });
  }

  const session = await response.json();
  return new Response(JSON.stringify(session), {
    headers: { "Content-Type": "application/json" },
  });
};
