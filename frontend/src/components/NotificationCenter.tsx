import { useEffect, useState } from "react";
import { apiCall } from "../services/api";
import { Notification } from "../types";

export default function NotificationCenter() {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    apiCall("/notifications/").then(setItems).catch(console.error);
  }, []);

  const markRead = async (id: number) => {
    await apiCall(`/notifications/${id}/read/`, "POST");
    setItems((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
  };

  const markAllRead = async () => {
    const unreadItems = items.filter((item) => !item.is_read);
    await Promise.all(unreadItems.map((item) => apiCall(`/notifications/${item.id}/read/`, "POST")));
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
  };

  const unreadCount = items.filter((item) => !item.is_read).length;
  const visibleItems = items.filter((item) => {
    if (filter === "unread") return !item.is_read;
    if (filter === "read") return item.is_read;
    return true;
  });

  return (
    <div className="notification-center">
      <div className="notification-header">
        <div>
          <h3>Notifications</h3>
          <span>{unreadCount} unread</span>
        </div>
        {unreadCount > 0 && <button type="button" className="secondary-button compact-button" onClick={markAllRead}>Mark all read</button>}
      </div>
      <div className="notification-filters">
        <button type="button" className={filter === "all" ? "active-filter" : ""} onClick={() => setFilter("all")}>All</button>
        <button type="button" className={filter === "unread" ? "active-filter" : ""} onClick={() => setFilter("unread")}>Unread</button>
        <button type="button" className={filter === "read" ? "active-filter" : ""} onClick={() => setFilter("read")}>Read</button>
      </div>
      {visibleItems.length === 0 ? <p>No notifications found.</p> : visibleItems.map((item) => (
        <div className={`notification-card ${item.is_read ? "read" : "unread"}`} key={item.id}>
          <div className="notification-title-row">
            <strong>{item.title}</strong>
            <span>{item.is_read ? "Read" : "Unread"}</span>
          </div>
          <p>{item.message}</p>
          <div className="notification-actions">
            {item.link && <a className="compact-button secondary-button" href={item.link}>Open</a>}
            {!item.is_read && <button type="button" className="compact-button" onClick={() => markRead(item.id)}>Mark read</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
