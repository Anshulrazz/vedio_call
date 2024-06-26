import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import "./room.css"; // Assuming you have a CSS file for styling

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [isMuted, setIsMuted] = useState(false);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const tracks = stream.getTracks();
    const audioTrack = tracks.find(track => track.kind === 'audio');
    const videoTrack = tracks.find(track => track.kind === 'video');
    const newStream = new MediaStream([videoTrack,audioTrack]);
    
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(newStream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      const tracks = stream.getTracks();
      const audioTrack = tracks.find(track => track.kind === 'audio');
      const videoTrack = tracks.find(track => track.kind === 'video');
      const newStream = new MediaStream([videoTrack,audioTrack]);
      
      setMyStream(newStream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    if (myStream) {
      for (const track of myStream.getTracks()) {
        peer.peer.addTrack(track, myStream);
      }
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  // Function to toggle mute/unmute
  const toggleMute = () => {
    setIsMuted(prevState => !prevState);
  };

  return (
    <div className="room-page-container">
      <div className="controls">
        <button className="mute-button" onClick={toggleMute}>
          {isMuted ? "Unmute" : "Mute"}
        </button>
        {remoteSocketId ? (
          <button className="call-button" onClick={handleCallUser}>Call</button>
        ) : (
          <p>No one in room</p>
        )}
        {myStream && <button className="send-stream" onClick={sendStreams}>Send Stream</button>}
      </div>
      <div className="video">
        <div className="mystream">
          {myStream && (
            <ReactPlayer
              playing
              muted={isMuted}
              height="100%"
              width="100%"
              url={myStream}
            />
          )}
        </div>
        <div className="fstream">
          {remoteStream && (
            <ReactPlayer
              playing
              muted={isMuted}
              height="100%"
              width="100%"
              url={remoteStream}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
