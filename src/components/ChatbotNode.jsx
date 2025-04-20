import React, { useState } from 'react';

const ChatbotNode = ({ data }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
  
    const sendMessage = async () => {
      const res = await fetch("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: input,
          chat_id: data.nodeId,
          history: messages.map(m => m.text)
        }),
        headers: { "Content-Type": "application/json" }
      });
  
      const { reply } = await res.json();
      setMessages([...messages, { text: input, from: "user" }, { text: reply, from: "bot" }]);
      setInput("");
    };
  
    return (
      <div className="bg-white p-3 rounded shadow-md w-72">
        <h4 className="font-bold mb-2">Chatbot: {data.label}</h4>
        <div className="h-32 overflow-y-scroll text-sm">
          {messages.map((m, i) => (
            <p key={i} className={`${m.from === "bot" ? "text-blue-500" : "text-gray-800"}`}>
              <strong>{m.from}:</strong> {m.text}
            </p>
          ))}
        </div>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="mt-2 border px-2 py-1 w-full text-sm"
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="mt-1 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded w-full"
        >
          Send
        </button>
      </div>
    );
  };
  
export default ChatbotNode;
  