import { randomUUID } from "node:crypto";

const store = globalThis.__nakaruStore || {
  accounts: new Map(),
  sessions: new Map(),
  oauthStates: new Map(),
  users: new Map(),
  publicMessages: new Map(),
  directMessages: new Map(),
  callSignals: new Map(),
  feedPosts: []
};

if (!globalThis.__nakaruStore) {
  const seedMessages = {
    "Moonlit Lounge": [
      ["Ami", "The soundtrack has no business being this good."],
      ["Kairo", "Anyone staying for co-op after the episode?"],
      ["Mina", "New here. This room already feels comfortable."],
      ["Sora", "Spoiler shield saved me twice tonight."]
    ],
    "Raid After Credits": [
      ["RaeArcade", "Forming a dungeon party after the credits."],
      ["Yuna", "I can heal if someone tanks."],
      ["Kairo", "Voice chat is open for the raid group."]
    ],
    "Classic Mecha Night": [
      ["KuroQuest", "That transformation scene still holds up."],
      ["Ami", "Model kit talk after the episode?"],
      ["Ren", "Ranked matches in thirty."]
    ]
  };

  for (const [room, messages] of Object.entries(seedMessages)) {
    store.publicMessages.set(room, messages.map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() })));
  }

  store.directMessages.set(
    "RaeArcade",
    [
      ["RaeArcade", "You joining the raid after credits?"],
      ["YukiKaze", "Yes. Save me a slot."]
    ].map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() }))
  );
  store.directMessages.set(
    "NovaOnigiri",
    [
      ["NovaOnigiri", "I made a cozy watch list for Sunday."],
      ["YukiKaze", "Send it over."]
    ].map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() }))
  );
  store.directMessages.set(
    "KuroQuest",
    [
      ["KuroQuest", "Classic Mecha Night is starting soon."],
      ["YukiKaze", "I am bringing the nostalgia."]
    ].map(([from, text]) => ({ id: randomUUID(), from, text, at: Date.now() }))
  );

  store.feedPosts.push(
    {
      id: randomUUID(),
      from: "Ami",
      text: "Tonight's watch party is spoiler-safe. Drop your favorite opening themes.",
      youtubeUrl: "",
      image: "",
      at: Date.now() - 18_000,
      appropriate: true
    },
    {
      id: randomUUID(),
      from: "RaeArcade",
      text: "Raid After Credits is open after the episode. Bring your builds.",
      youtubeUrl: "",
      image: "",
      at: Date.now() - 10_000,
      appropriate: true
    }
  );

  globalThis.__nakaruStore = store;
}

export { store };
