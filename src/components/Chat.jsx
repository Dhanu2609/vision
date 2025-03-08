import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import EmojiPicker from "emoji-picker-react";
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, addDoc, serverTimestamp, arrayUnion
} from "firebase/firestore";
import "./Chat.css";

const Chat = () => {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showDeletePopup, setShowDeletePopup] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(newMessages);
      
      // Update seen status for messages not sent by current user
      newMessages.forEach(async (msg) => {
        if (msg.uid !== user.uid && !msg.seenBy?.includes(user.uid)) {
          await updateDoc(doc(db, "messages", msg.id), {
            seenBy: arrayUnion(user.uid),
            seenAt: serverTimestamp(),
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await addDoc(collection(db, "messages"), {
        text: message,
        replyTo: replyTo ? replyTo.id : null,
        name: user.displayName || "Anonymous",
        uid: user.uid,
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
        seenBy: [],
      });
      setMessage("");
      setReplyTo(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const editMessage = async (id, newText) => {
    if (!newText.trim()) return;
    await updateDoc(doc(db, "messages", id), { text: newText });
    setEditId(null);
  };

  const confirmDelete = (id) => setShowDeletePopup(id);
  const deleteMessage = async () => {
    await deleteDoc(doc(db, "messages", showDeletePopup));
    setShowDeletePopup(null);
  };

  const handleEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="chat-user">
          <img src={user.photoURL || "https://via.placeholder.com/40"} alt="User" className="profile-pic" />
          <h3>{user.displayName}</h3>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.uid === user.uid ? "sent" : "received"}`}>
            <img src={msg.photoURL || "https://via.placeholder.com/40"} alt="User" className="profile-pic" />
            <div className="message-content" onClick={() => setReplyTo(msg)}>
              {msg.replyTo && (
                <div className="reply-message">
                  <small>Replying to: {messages.find(m => m.id === msg.replyTo)?.text || "Deleted message"}</small>
                </div>
              )}
              <p className="message-text">{msg.text}</p>
              <p className="timestamp">
                {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleString() : "Sending..."}
              </p>
              {msg.seenBy && msg.seenBy.length > 0 && (
                <p className="seen-status">
                  👀 Seen by {msg.seenBy.length} {msg.seenAt?.seconds ? `at ${new Date(msg.seenAt.seconds * 1000).toLocaleTimeString()}` : ""}
                </p>
              )}
              {msg.uid === user.uid && (
                <div className="message-actions">
                  <button onClick={() => setEditId(msg.id)}>✏️</button>
                  <button onClick={() => confirmDelete(msg.id)}>🗑️</button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </div>

      <div className="chat-input">
        {replyTo && (
          <div className="reply-preview">
            <p>Replying to: {replyTo.text}</p>
            <button onClick={() => setReplyTo(null)}>❌</button>
          </div>
        )}
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😀</button>
        {showEmojiPicker && <EmojiPicker onEmojiClick={handleEmojiClick} />}
        <input
          type="text"
          value={editId ? editText : message}
          onChange={(e) => editId ? setEditText(e.target.value) : setMessage(e.target.value)}
          onKeyDown={handleKeyPress} // Send message on Enter key press
          placeholder="Type a message..."
        />
        {editId ? (
          <button onClick={() => editMessage(editId, editText)}>Update</button>
        ) : (
          <button onClick={sendMessage}>Send</button>
        )}
      </div>
    </div>
  );
};

export default Chat;
