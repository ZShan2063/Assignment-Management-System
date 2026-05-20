import { FormEvent, useEffect, useState } from "react";
import { apiCall } from "../services/api";
import { AssignmentMessage } from "../types";
import { formatDate } from "../utils/date";

export default function AssignmentDiscussion({ assignmentId }: { assignmentId: number }) {
  const [messages, setMessages] = useState<AssignmentMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMessages = async () => {
    try {
      setMessages(await apiCall(`/assignments/${assignmentId}/messages/`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load discussion.");
    }
  };

  useEffect(() => {
    loadMessages();
  }, [assignmentId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }
    try {
      await apiCall(`/assignments/${assignmentId}/messages/`, "POST", { message: message.trim() });
      setMessage("");
      setError("");
      loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    }
  };

  return (
    <div className="discussion-box">
      <strong>Discussion</strong>
      <div className="discussion-list">
        {messages.length === 0 ? (
          <p className="muted-text">No messages yet.</p>
        ) : messages.map((item) => (
          <div className="discussion-message" key={item.id}>
            <div>
              <strong>{item.sender_name}</strong>
              <span>{item.sender_role}</span>
            </div>
            <p>{item.message}</p>
            <small>{formatDate(item.created_at)}</small>
          </div>
        ))}
      </div>
      <form className="discussion-form" onSubmit={submit}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a message"
        />
        <button type="submit" className="compact-button">Send</button>
      </form>
      {error && <p className="alert alert-error">{error}</p>}
    </div>
  );
}
