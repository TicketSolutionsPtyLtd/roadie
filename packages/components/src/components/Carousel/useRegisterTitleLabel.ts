'use client'

import { useEffect } from 'react'

import { useCarouselContext } from './CarouselContext'

// Register this title as the carousel's accessible name. The cleanup
// only clears labelId if it still points at *this* title — guards
// against responsive remounts where two titles fight over labelId.
export function useRegisterTitleLabel(titleId: string) {
  const { setLabelId } = useCarouselContext()
  useEffect(() => {
    setLabelId(titleId)
    return () => {
      setLabelId((current) => (current === titleId ? undefined : current))
    }
  }, [titleId, setLabelId])
}
