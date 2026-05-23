export function parseYouTubeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") videoId = url.pathname.slice(1).split("/")[0];
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
      if (url.pathname.startsWith("/shorts/")) videoId = url.pathname.split("/")[2] || "";
      if (url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] || "";
    }
    if (host === "youtube-nocookie.com" && url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2] || "";
    }

    videoId = videoId.split(/[?&#/]/)[0];
    if (!/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return null;

    return {
      videoId,
      originalUrl: url.href,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    };
  } catch {
    return null;
  }
}
