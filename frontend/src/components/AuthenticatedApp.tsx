"use client";

import { useSyncExternalStore } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginScreen } from "@/components/LoginScreen";

const sessionKey = "kanban-studio-session";
const sessionSubscribers = new Set<() => void>();

const subscribeToSession = (subscriber: () => void) => {
  sessionSubscribers.add(subscriber);
  window.addEventListener("storage", subscriber);

  return () => {
    sessionSubscribers.delete(subscriber);
    window.removeEventListener("storage", subscriber);
  };
};

const getSessionSnapshot = () =>
  window.localStorage.getItem(sessionKey) === "authenticated";

const notifySessionSubscribers = () => {
  sessionSubscribers.forEach((subscriber) => subscriber());
};

export const AuthenticatedApp = () => {
  const isAuthenticated = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    () => false
  );

  const handleLogin = (username: string, password: string) => {
    if (username !== "user" || password !== "password") {
      return false;
    }

    window.localStorage.setItem(sessionKey, "authenticated");
    notifySessionSubscribers();
    return true;
  };

  const handleLogout = () => {
    window.localStorage.removeItem(sessionKey);
    notifySessionSubscribers();
  };

  return isAuthenticated ? (
    <KanbanBoard onLogout={handleLogout} />
  ) : (
    <LoginScreen onLogin={handleLogin} />
  );
};
