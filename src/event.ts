import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type ActiveEvent = {
  slug: string;
  label: string;
  labelZh?: string | null;
  description?: string | null;
};

type EventContextValue = {
  activeEvent: ActiveEvent | null;
  setActiveEvent: (event: ActiveEvent | null) => void;
};

const EventContext = createContext<EventContextValue>({
  activeEvent: null,
  setActiveEvent: () => {},
});

export function EventProvider({ children }: { children: ReactNode }) {
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  return React.createElement(
    EventContext.Provider,
    { value: { activeEvent, setActiveEvent } },
    children
  );
}

export function useEvent() {
  return useContext(EventContext);
}
