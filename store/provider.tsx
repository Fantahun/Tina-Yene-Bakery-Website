"use client"

import { useEffect, useRef } from "react"
import { Provider } from "react-redux"
import { store } from "./store"
import { hydrateCart } from "./cart-slice"

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useRef(false)

  useEffect(() => {
    if (!hydrated.current) {
      store.dispatch(hydrateCart())
      hydrated.current = true
    }
  }, [])

  return <Provider store={store}>{children}</Provider>
}
