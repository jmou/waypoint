/**
 * NavigationContext — provides the onNavigate callback to any component
 * in the tree, including TipTap node views which can't access extension
 * options directly.
 */

import React, { createContext, useContext } from "react";

type NavigateFn = (view: string) => void;

const NavigationContext = createContext<NavigateFn>(() => {});

export function NavigationProvider({
  onNavigate,
  children,
}: {
  onNavigate: NavigateFn;
  children: React.ReactNode;
}) {
  return (
    <NavigationContext.Provider value={onNavigate}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigate(): NavigateFn {
  return useContext(NavigationContext);
}
