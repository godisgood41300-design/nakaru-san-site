export const rooms = [
  { id: "anime", name: "Anime", kind: "public", topic: "Watch parties, openings, episode talk", color: "#7c3cff" },
  { id: "gaming", name: "Gaming", kind: "public", topic: "Co-op queues, builds, raids, ranked", color: "#38bdf8" },
  { id: "manga", name: "Manga", kind: "public", topic: "Chapters, panels, collecting, theories", color: "#facc15" },
  { id: "general", name: "General", kind: "public", topic: "Community lounge and introductions", color: "#a78bfa" },
  { id: "nakaru-san", name: "Nakaru-San", kind: "public", topic: "Platform updates and creator rooms", color: "#f59e0b" }
];

export const privateRooms = [
  { id: "crew-night", name: "Crew Night", topic: "Invite-only watch list planning", members: 4 },
  { id: "raid-party", name: "Raid Party", topic: "Private gaming voice room", members: 6 }
];

export const demoUsers = [
  { id: "demo-1", username: "AmiArc", display_name: "Ami Arc", avatar_url: "", bio: "Spoiler-safe watch party host." },
  { id: "demo-2", username: "RaeArcade", display_name: "Rae Arcade", avatar_url: "", bio: "Co-op healer and late-night grinder." },
  { id: "demo-3", username: "NovaInk", display_name: "Nova Ink", avatar_url: "", bio: "Manga panels, lore, and original characters." }
];

export const demoPosts = [
  {
    id: "post-1",
    user_id: "demo-1",
    author: "Ami Arc",
    type: "text",
    content: "Moonlit Lounge is open tonight. Keep it spoiler-safe and bring opening theme recommendations.",
    likes: 18,
    comments: 4,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  },
  {
    id: "post-2",
    user_id: "demo-2",
    author: "Rae Arcade",
    type: "youtube",
    content: "Sharing a boss music reference for tonight's raid energy.",
    youtube_url: "https://youtu.be/dQw4w9WgXcQ",
    youtube_embed_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    likes: 31,
    comments: 7,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  }
];

export const demoMessages = {
  anime: [
    { id: "m1", author: "Ami Arc", text: "What is everyone watching tonight?", created_at: new Date().toISOString() },
    { id: "m2", author: "Nova Ink", text: "I am bringing the manga comparison notes.", created_at: new Date().toISOString() }
  ],
  gaming: [
    { id: "m3", author: "Rae Arcade", text: "Need one tank for the raid queue.", created_at: new Date().toISOString() }
  ]
};

export const demoThreads = [
  {
    id: "dm-rae",
    user: "Rae Arcade",
    preview: "Ready for co-op later?",
    messages: [
      { id: "dm1", fromMe: false, text: "Ready for co-op later?", created_at: new Date().toISOString() },
      { id: "dm2", fromMe: true, text: "Yes, save me a slot.", created_at: new Date().toISOString() }
    ]
  },
  {
    id: "dm-nova",
    user: "Nova Ink",
    preview: "Dropping panel references now.",
    messages: [
      { id: "dm3", fromMe: false, text: "Dropping panel references now.", created_at: new Date().toISOString() }
    ]
  }
];
