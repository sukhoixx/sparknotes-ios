import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type ActiveEvent = {
  slug: string;
  label: string;
  labelZh?: string | null;
  description?: string | null;
};

type EventContextValue = {
  activeEvents: ActiveEvent[];
  setActiveEvents: (events: ActiveEvent[]) => void;
};

const EventContext = createContext<EventContextValue>({
  activeEvents: [],
  setActiveEvents: () => {},
});

export function EventProvider({ children }: { children: ReactNode }) {
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  return React.createElement(
    EventContext.Provider,
    { value: { activeEvents, setActiveEvents } },
    children
  );
}

export function useEvent() {
  return useContext(EventContext);
}
