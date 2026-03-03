import React, { useEffect, useMemo, useState } from "react"

type Props = {
  targetMs: number
  onFinish?: () => void
}

export function Countdown(props: Props) {
  const { targetMs, onFinish } = props
  const [now, setNow] = useState(() => Date.now())

  const leftSeconds = useMemo(() => {
    const leftMs = Math.max(0, targetMs - now)
    return Math.ceil(leftMs / 1000)
  }, [now, targetMs])

  useEffect(() => {
    if (leftSeconds <= 0) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [leftSeconds])

  useEffect(() => {
    if (leftSeconds === 0) onFinish?.()
  }, [leftSeconds, onFinish])

  return <span>{leftSeconds}</span>
}
