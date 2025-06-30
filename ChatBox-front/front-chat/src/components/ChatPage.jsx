import React, { useEffect, useRef, useState } from "react";
import { 
  MdSend, 
  MdAttachFile, 
  MdMic, 
  MdMicOff, 
  MdVolumeUp, 
  MdSettings, 
  MdExitToApp,
  MdEmojiEmotions,
  MdSearch,
  MdPerson,
  MdGroup,
  MdCall,
  MdCallEnd,
  MdVideoCall,
  MdVideocamOff,
  MdScreenShare,
  MdStopScreenShare
} from "react-icons/md";
import useChatContext from "../context/ChatContext";
import { useNavigate } from "react-router";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import toast from "react-hot-toast";
import { baseURL } from "../config/AxiosHelper";
import { getMessagess } from "../services/RoomService";
import { timeAgo } from "../config/helper";

const ChatPage = () => {
  const {
    roomId,
    currentUser,
    connected,
    setConnected,
    setRoomId,
    setCurrentUser,
  } = useChatContext();

  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineUsers] = useState(['Alice', 'Bob', 'Charlie', currentUser]);
  const [isRecording, setIsRecording] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stompClient, setStompClient] = useState(null);
  
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);

  const emojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🔥', '💯', '🎉'];

  useEffect(() => {
    if (!connected) {
      navigate("/");
    }
  }, [connected, roomId, currentUser]);

  // Load messages
  useEffect(() => {
    async function loadMessages() {
      try {
        const msgs = await getMessagess(roomId);
        setMessages(msgs);
      } catch (error) {
        console.log(error);
      }
    }
    if (connected) {
      loadMessages();
    }
  }, [connected, roomId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const sock = new SockJS(`${baseURL}/chat`);
      const client = Stomp.over(sock);

      client.connect({}, () => {
        setStompClient(client);
        toast.success("Connected to chat");

        client.subscribe(`/topic/room/${roomId}`, (message) => {
          console.log(message);
          const newMessage = JSON.parse(message.body);
          setMessages((prev) => [...prev, newMessage]);
        });
      });
    };

    if (connected) {
      connectWebSocket();
    }
  }, [roomId, connected]);

  const sendMessage = () => {
    if (stompClient && connected && (input.trim() || selectedFile)) {
      const message = {
        sender: currentUser,
        content: selectedFile ? `📎 Shared: ${selectedFile.name}` : input,
        roomId: roomId,
        type: selectedFile ? 'file' : 'text',
        timeStamp: new Date().toISOString()
      };

      stompClient.send(
        `/app/sendMessage/${roomId}`,
        {},
        JSON.stringify(message)
      );
      
      setInput("");
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    toast.success("Recording started...");
    
    // Simulate recording for demo
    setTimeout(() => {
      setIsRecording(false);
      if (stompClient && connected) {
        const voiceMessage = {
          sender: currentUser,
          content: "🎤 Voice message",
          roomId: roomId,
          type: 'voice',
          timeStamp: new Date().toISOString()
        };
        stompClient.send(
          `/app/sendMessage/${roomId}`,
          {},
          JSON.stringify(voiceMessage)
        );
      }
      toast.success("Voice message sent!");
    }, 3000);
  };

  const toggleCall = () => {
    setInCall(!inCall);
    toast.success(inCall ? "Call ended" : "Call started");
  };

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
    toast.success(videoEnabled ? "Video disabled" : "Video enabled");
  };

  const toggleScreenShare = () => {
    setScreenSharing(!screenSharing);
    toast.success(screenSharing ? "Screen sharing stopped" : "Screen sharing started");
  };

  const handleLogout = () => {
    if (stompClient) {
      stompClient.disconnect();
    }
    setConnected(false);
    setRoomId("");
    setCurrentUser("");
    navigate("/");
    toast.success("Left the room");
  };

  const addEmoji = (emoji) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const filteredMessages = messages.filter(msg => 
    msg.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.sender?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen bg-gray-800 flex">
      {/* Sidebar */}
      <div className="w-80 bg-gray-900 flex flex-col">
        {/* Server Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <MdGroup className="text-white text-sm" />
            </div>
            ChatBox Server
          </h2>
        </div>

        {/* Room Info */}
        <div className="p-4 border-b border-gray-700">
          <div className="text-gray-400 text-sm mb-2">CURRENT ROOM</div>
          <div className="text-white font-semibold flex items-center gap-2">
            <span className="text-xl">#</span>
            {roomId}
          </div>
        </div>

        {/* Voice Channel */}
        <div className="p-4 border-b border-gray-700">
          <div className="text-gray-400 text-sm mb-2">VOICE CHANNELS</div>
          <div className="flex items-center justify-between bg-gray-800 rounded p-2">
            <div className="flex items-center gap-2 text-gray-300">
              <MdVolumeUp />
              <span>General</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={toggleCall}
                className={`p-1 rounded ${inCall ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'} hover:bg-opacity-80`}
              >
                {inCall ? <MdCallEnd size={16} /> : <MdCall size={16} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-1 rounded ${videoEnabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'} hover:bg-opacity-80`}
              >
                {videoEnabled ? <MdVideoCall size={16} /> : <MdVideocamOff size={16} />}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-1 rounded ${screenSharing ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'} hover:bg-opacity-80`}
              >
                {screenSharing ? <MdStopScreenShare size={16} /> : <MdScreenShare size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Online Users */}
        <div className="flex-1 p-4">
          <div className="text-gray-400 text-sm mb-2">ONLINE — {onlineUsers.length}</div>
          <div className="space-y-2">
            {onlineUsers.map((user, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <MdPerson className="text-white text-sm" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                </div>
                <span className={user === currentUser ? 'font-semibold text-yellow-400' : ''}>{user}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Panel */}
        <div className="p-4 bg-gray-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
              <MdPerson className="text-white text-sm" />
            </div>
            <span className="text-white font-semibold">{currentUser}</span>
          </div>
          <div className="flex gap-2">
            <button className="text-gray-400 hover:text-white p-1">
              <MdSettings size={18} />
            </button>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 p-1">
              <MdExitToApp size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <span className="text-2xl text-gray-400">#</span>
              <h3 className="font-semibold">{roomId}</h3>
            </div>
            <div className="w-px h-6 bg-gray-600"></div>
            <div className="text-gray-400 text-sm">Room chat</div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-700 text-white rounded-md px-3 py-1 pl-8 text-sm w-48"
              />
              <MdSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredMessages.map((message, index) => (
            <div key={index} className="flex items-start gap-3 hover:bg-gray-700/30 p-2 rounded">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MdPerson className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`font-semibold ${message.sender === currentUser ? 'text-yellow-400' : 'text-white'}`}>
                    {message.sender}
                  </span>
                  <span className="text-xs text-gray-400">{timeAgo(message.timeStamp)}</span>
                  {message.type === 'system' && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">SYSTEM</span>
                  )}
                </div>
                <div className={`text-gray-300 ${message.type === 'file' ? 'bg-gray-700 p-2 rounded' : ''}`}>
                  {message.type === 'voice' ? (
                    <div className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                      <MdMic className="text-green-400" />
                      <div className="flex-1 bg-gray-600 h-2 rounded-full">
                        <div className="bg-green-400 h-2 rounded-full w-1/3"></div>
                      </div>
                      <span className="text-xs">0:03</span>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-gray-800">
          {selectedFile && (
            <div className="mb-2 bg-gray-700 p-2 rounded flex items-center justify-between">
              <span className="text-sm text-gray-300">📎 {selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-gray-700 rounded-lg">
              <div className="flex items-center p-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-white p-1 mr-2"
                >
                  <MdAttachFile size={20} />
                </button>
                
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={`Message #${roomId}`}
                  className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                />
                
                <div className="flex items-center gap-1 ml-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <MdEmojiEmotions size={20} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg p-2 flex flex-wrap gap-1 w-48">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => addEmoji(emoji)}
                            className="hover:bg-gray-700 p-1 rounded text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {isRecording ? (
                    <div className="text-red-400 p-1 animate-pulse">
                      <MdMicOff size={20} />
                    </div>
                  ) : (
                    <button
                      onClick={startVoiceRecording}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <MdMic size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={sendMessage}
              disabled={!input.trim() && !selectedFile}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
            >
              <MdSend size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;