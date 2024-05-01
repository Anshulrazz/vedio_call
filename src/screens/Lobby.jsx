import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import './lobby.css'

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { email, room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="lobby">
      <div class="login-box">
        <h2>Lobby..</h2>
        <form onSubmit={handleSubmitForm}>
          <div class="user-box">
            <input class="frm" type="text" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            <label>Enter Email</label>
          </div>
          <div class="user-box">
            <input class="frm" type="text" value={room}
              onChange={(e) => setRoom(e.target.value)} required />
            <label>Enter Room Id</label>
          </div>
          <button>Join Room</button>
        </form>
      </div>
    </div>
  );
};

export default LobbyScreen;
