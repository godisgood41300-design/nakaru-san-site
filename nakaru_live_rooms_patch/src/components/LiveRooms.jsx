import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Radio, Search, Square, Users, Video } from "lucide-react";
import { supabase } from "../lib/supabaseClient.js";

const categories = ["Anime", "Gaming", "Manga", "Music", "Community", "General"];

export default function LiveRooms({ user }) {
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [cameraStatus, setCameraStatus] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [form, setForm] = useState({
    title: "",
    category: "Anime",
    description: ""
  });

  useEffect(() => {
    loadRooms();

    const channel = supabase
      .channel("live_rooms_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_rooms" },
        () => loadRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopLocalStream();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && localStreamRef.current) {
      videoRef.current.srcObject = localStreamRef.current;
    }
  }, [isStreaming, selectedRoom]);

  const filteredRooms = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return rooms;

    return rooms.filter((room) => {
      return [
        room.title,
        room.category,
        room.description
      ].some((field) => String(field || "").toLowerCase().includes(value));
    });
  }, [rooms, search]);

  async function loadRooms() {
    setLoadingRooms(true);

    const { data, error } = await supabase
      .from("live_rooms")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setStatus(error.message);
    } else {
      setRooms(data || []);
      if (selectedRoom) {
        const updatedSelected = (data || []).find((room) => room.id === selectedRoom.id);
        if (updatedSelected) setSelectedRoom(updatedSelected);
      }
    }

    setLoadingRooms(false);
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function createRoom(event) {
    event.preventDefault();
    setStatus("");

    if (!form.title.trim()) {
      setStatus("Add a room title first.");
      return;
    }

    const { data, error } = await supabase
      .from("live_rooms")
      .insert({
        host_id: user.id,
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        is_live: false,
        viewer_count: 0
      })
      .select()
      .single();

    if (error) {
      setStatus(error.message);
      return;
    }

    setSelectedRoom(data);
    setForm({ title: "", category: "Anime", description: "" });
    setStatus("Room created. Click Go Live to start your camera preview.");
    await loadRooms();
  }

  async function joinRoom(room) {
    setSelectedRoom(room);
    setStatus(`Joined ${room.title}.`);

    const nextCount = Math.max(0, Number(room.viewer_count || 0) + 1);

    await supabase
      .from("live_rooms")
      .update({
        viewer_count: nextCount,
        updated_at: new Date().toISOString()
      })
      .eq("id", room.id);

    await loadRooms();
  }

  async function goLive() {
    setStatus("");
    setCameraStatus("");

    if (!selectedRoom) {
      setStatus("Create or join a room first.");
      return;
    }

    if (selectedRoom.host_id !== user.id) {
      setStatus("Only the room host can start Go Live for this room.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsStreaming(true);
      setCameraStatus("Camera and microphone are active.");

      const { error } = await supabase
        .from("live_rooms")
        .update({
          is_live: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedRoom.id);

      if (error) throw error;

      await loadRooms();
    } catch (error) {
      setCameraStatus(
        error?.name === "NotAllowedError"
          ? "Camera/mic permission was blocked. Allow permissions in your browser and try again."
          : error.message || "Camera/mic could not start."
      );
    }
  }

  async function endLive() {
    stopLocalStream();
    setIsStreaming(false);
    setCameraStatus("Live preview ended.");

    if (selectedRoom && selectedRoom.host_id === user.id) {
      await supabase
        .from("live_rooms")
        .update({
          is_live: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedRoom.id);

      await loadRooms();
    }
  }

  function stopLocalStream() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  return (
    <section className="liveRooms">
      <div className="card">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Live Rooms</p>
            <h2>Go Live Dashboard</h2>
          </div>
          <div className={`liveBadge ${isStreaming ? "active" : ""}`}>
            <Radio size={16} />
            {isStreaming ? "Live Preview Active" : "Offline"}
          </div>
        </div>

        <div className="videoShell">
          {selectedRoom ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="videoPreview" />
              {!isStreaming && (
                <div className="videoPlaceholder">
                  <Camera size={44} />
                  <h3>{selectedRoom.title}</h3>
                  <p>{selectedRoom.host_id === user.id ? "Press Go Live to start camera preview." : "You joined this room as a viewer."}</p>
                </div>
              )}
            </>
          ) : (
            <div className="videoPlaceholder">
              <Video size={44} />
              <h3>No room selected</h3>
              <p>Create a room or join one from the list below.</p>
            </div>
          )}
        </div>

        <div className="actionRow">
          <button className="primaryButton" onClick={goLive} disabled={!selectedRoom || selectedRoom.host_id !== user.id || isStreaming}>
            <Radio size={18} />
            Go Live
          </button>

          <button className="secondaryButton" onClick={endLive} disabled={!isStreaming}>
            <Square size={18} />
            End Live
          </button>
        </div>

        {cameraStatus && <p className="message">{cameraStatus}</p>}
        {status && <p className="message">{status}</p>}
      </div>

      <div className="twoGrid">
        <div className="card">
          <h2>Create a Room</h2>
          <form onSubmit={createRoom}>
            <label>
              Room Title
              <input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Anime debate, gaming lobby, manga night..."
              />
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="Tell people what this room is about..."
              />
            </label>

            <button className="primaryButton" type="submit">Create Room</button>
          </form>
        </div>

        <div className="card">
          <div className="searchBox">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search live rooms..."
            />
          </div>

          <div className="roomList">
            {loadingRooms ? (
              <p className="muted">Loading rooms...</p>
            ) : filteredRooms.length === 0 ? (
              <p className="muted">No rooms found yet.</p>
            ) : (
              filteredRooms.map((room) => (
                <button
                  key={room.id}
                  className={`roomCard ${selectedRoom?.id === room.id ? "selected" : ""}`}
                  onClick={() => joinRoom(room)}
                >
                  <span className={`dot ${room.is_live ? "on" : ""}`} />
                  <span>
                    <strong>{room.title}</strong>
                    <small>{room.category} • {room.is_live ? "LIVE" : "Offline"}</small>
                    {room.description && <em>{room.description}</em>}
                  </span>
                  <span className="viewerCount">
                    <Users size={15} />
                    {room.viewer_count || 0}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
