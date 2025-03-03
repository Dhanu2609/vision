import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import EmojiPicker from "emoji-picker-react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  collection, query, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, addDoc, serverTimestamp 
} from "firebase/firestore";
import "./Chat.css"; 

const Chat = () => {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showDeletePopup, setShowDeletePopup] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const chatEndRef = useRef(null); // Ref for scrolling

  // 🔥 Load all messages from Firestore
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(newMessages);

      // Mark messages as seen
      newMessages.forEach(async (msg) => {
        if (!msg.seenBy?.includes(user.uid)) {
          await updateDoc(doc(db, "messages", msg.id), {
            seenBy: [...(msg.seenBy || []), user.uid],
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user.uid]);

  // 🔽 Scroll to the latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ✅ Send Message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    try {
      await addDoc(collection(db, "messages"), {
        text: message,
        name: user.displayName || "Anonymous",
        uid: user.uid,
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
        seenBy: [],
      });
      setMessage(""); 
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    }
  };

  // ✅ Edit Message
  const editMessage = async (id, newText) => {
    if (!newText.trim()) return;
    await updateDoc(doc(db, "messages", id), { text: newText });
    setEditId(null);
  };

  // ✅ Delete Message
  const confirmDelete = (id) => setShowDeletePopup(id);
  const deleteMessage = async () => {
    await deleteDoc(doc(db, "messages", showDeletePopup));
    setShowDeletePopup(null);
  };

  // ✅ Emoji Picker
  const handleEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // 🎤 Start Recording Voice Message
  const startRecording = () => {
    setIsRecording(true);
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        await addDoc(collection(db, "messages"), {
          text: null,
          audioUrl,
          name: user.displayName,
          uid: user.uid,
          createdAt: serverTimestamp(),
        });
      };

      mediaRecorderRef.current.start();
    });
  };

  // 🛑 Stop Recording
  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
  
      // Upload audio file to Firebase Storage
      const storage = getStorage();
      const audioRef = ref(storage, `audioMessages/${Date.now()}.webm`);
      
      try {
        await uploadBytes(audioRef, audioBlob);
        const audioUrl = await getDownloadURL(audioRef);
  
        // Save audio URL to Firestore
        await addDoc(collection(db, "messages"), {
          text: null,
          audioUrl,
          name: user.displayName,
          uid: user.uid,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error uploading audio:", error);
        alert("Failed to upload audio message.");
      }
    };
  };
  

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-user">
          <img src={user.photoURL || "https://via.placeholder.com/40"} alt="User" className="profile-pic" />
          <div>
            <h3>{user.displayName}</h3>
            <p className="status">Online</p>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.uid === user.uid ? "sent" : "received"}`}>
            <img src={msg.photoURL || "https://via.placeholder.com/40"} alt="User" className="profile-pic" />
            <div className="message-content">
              {msg.text ? (
                editId === msg.id ? (
                  <input
                    className="edit-input"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => editMessage(msg.id, editText)}
                    onKeyPress={(e) => e.key === "Enter" && editMessage(msg.id, editText)}
                    autoFocus
                  />
                ) : (
                  <div>
                    <p className="message-text" onClick={() => { setEditId(msg.id); setEditText(msg.text); }}>
                      {msg.text}
                    </p>
                    <div>
                    <p className="timestamp">
  {msg?.createdAt
    ? new Date(msg.createdAt.seconds * 1000).toLocaleString("en-US", {
        year: "numeric",
        month: "short", // "long" for full month name
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
      })
    : "Sending..."}
</p>

<small className="seen-status">
  {msg.seenBy?.length > 1 
    ? `Seen by ${msg.seenBy.length - 1} others at ${new Date(msg.seenTime).toLocaleTimeString()}`
    : "Not seen yet"}
</small>

                    </div>
                  </div>
                )
              ) : (
                <audio controls>
                  <source src={msg.audioUrl} type="audio/webm" />
                  Your browser does not support audio playback.
                </audio>
              )}

              {msg.uid === user.uid && (
                <div className="message-actions">
                  <button className="edit-btn" onClick={() => { setEditId(msg.id); setEditText(msg.text); }}>✏️</button>
                  <button className="delete-btn" onClick={() => confirmDelete(msg.id)}>🗑️</button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef}></div> {/* Auto-scroll anchor */}
      </div>

      {/* Chat Input */}
      <div className="chat-input">
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😀</button>
        {showEmojiPicker && <EmojiPicker onEmojiClick={handleEmojiClick} />}
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." />
        
        {isRecording ? (
          <button onClick={stopRecording} className="recording-btn">🛑 Stop</button>
        ) : (
          <button onClick={startRecording} className="voice-btn">🎤</button>
        )}
        
        <button onClick={sendMessage} className="send-btn">Send</button>
      </div>

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <div className="popup">
          <div className="popup-content">
            <p>Are you sure you want to delete this message?</p>
            <button onClick={deleteMessage} className="delete-confirm-btn">Delete</button>
            <button onClick={() => setShowDeletePopup(null)} className="cancel-btn">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
