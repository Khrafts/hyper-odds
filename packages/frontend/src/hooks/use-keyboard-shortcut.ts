import { useEffect } from 'react'

export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKeys = []
      
      if (event.ctrlKey) pressedKeys.push('ctrl')
      if (event.metaKey) pressedKeys.push('cmd')
      if (event.shiftKey) pressedKeys.push('shift')
      if (event.altKey) pressedKeys.push('alt')
      
      pressedKeys.push(event.key.toLowerCase())
      
      // Check if pressed keys match the shortcut
      if (keys.length === pressedKeys.length && 
          keys.every(key => pressedKeys.includes(key.toLowerCase()))) {
        event.preventDefault()
        callback()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, deps)
}