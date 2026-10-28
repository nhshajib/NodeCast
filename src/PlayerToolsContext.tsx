import React, { createContext, useContext, useState } from 'react';
import { sleepDeadline } from './playerTools';
const Tools = createContext<{ deadline: number | null; setTimer: (minutes: number) => void; clear: () => void }>({ deadline: null, setTimer: () => {}, clear: () => {} });
export const useSleepTimer = () => useContext(Tools);
export function PlayerToolsProvider({ children }: { children: React.ReactNode }) { const [deadline,setDeadline]=useState<number|null>(null);return <Tools.Provider value={{deadline,setTimer:minutes=>setDeadline(sleepDeadline(minutes)),clear:()=>setDeadline(null)}}>{children}</Tools.Provider>; }
