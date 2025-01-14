import './App.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import { SERVER_URL } from './constants';

function App() {
  // Text Editor & Sync
  const [text, setText] = useState('')
  const [textId, setTextId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Array<{ id: string; text: string }>>([])
  const [syncTimeout, setSyncTimeout] = useState<NodeJS.Timeout | null>(null)
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 })

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])

  // UI
  const [showActions, setShowActions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // AI contributions
  const [rephrases, setRephrases] = useState<string[]>([])
  const [reflection, setReflection] = useState<string>('')

  const fetchNotes = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/get_all_texts`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (Array.isArray(data)) {
        setNotes(data)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const fetchRephrases = useCallback(async (context: string, selectedText: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${SERVER_URL}/api/rephrase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ context, selectedText }),
      })
      const data = await response.json()
      if (!response.ok) {
        console.error('Error from server:', data.error)
        setRephrases([])
        return
      }
      if (!data.rephrases || !Array.isArray(data.rephrases)) {
        console.error('Invalid response format')
        setRephrases([])
        return
      }
      setRephrases(data.rephrases)
    } catch (error) {
      console.error('Error fetching rephrases:', error)
      setRephrases([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchReflection = useCallback(async (context: string, selectedText: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${SERVER_URL}/api/reflect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ selectedText: selectedText, context: context }),
      })
      const data = await response.json()
      if (!response.ok) {
        console.error('Error from server:', data.error)
        setReflection('')
        return
      }
      if (!data.reflection || typeof data.reflection !== 'string') {
        console.error('Invalid response format')
        setReflection('')
        return
      }
      setReflection(data.reflection)
    } catch (error) {
      console.error('Error fetching reflections:', error)
      setReflection('')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    const newStart = target.selectionStart || 0
    const newEnd = target.selectionEnd || 0

    setSelection({ start: newStart, end: newEnd })

    // Only show actions if there's actually a selection
    if (newStart !== newEnd) {
      setShowActions(true)
    } else {
      setRephrases([])
      setShowActions(false)
    }
  }

  const handleActionClick = (action: 'rephrase' | 'reflect' | 'prompt') => {
    const selectedText = text.substring(selection.start, selection.end)
    const context = text.substring(
      Math.max(0, selection.start - 100),
      Math.min(text.length, selection.end + 100)
    );

    if (action === 'rephrase') {
      fetchRephrases(context, selectedText)
    } else if (action === 'reflect') {
      fetchReflection(context, selectedText)
    } else if (action === 'prompt') {
      handlePromptRequest()
    }

    setShowActions(false)
  }

  const applySuggestion = (suggestion: string) => {
    const newText =
      text.substring(0, selection.start) +
      "\n" +
      suggestion +
      text.substring(selection.end)
    setText(newText)
    syncTextWithServer(newText)
    setRephrases([])
  }

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousText = undoStack[undoStack.length - 1]
      const newUndoStack = undoStack.slice(0, -1)

      setUndoStack(newUndoStack)
      setRedoStack([text, ...redoStack])
      setText(previousText)
    }
  }, [text, undoStack, redoStack])

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextText = redoStack[0]
      const newRedoStack = redoStack.slice(1)

      setUndoStack([...undoStack, text])
      setRedoStack(newRedoStack)
      setText(nextText)
    }
  }, [text, undoStack, redoStack])

  const syncTextWithServer = useCallback(async (newText: string) => {
    if (newText.trim() === '') {
      return
    }

    try {
      const response = await fetch(`${SERVER_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text: newText,
          textId: textId // Include textId if we have one
        }),
      })

      if (!response.ok) {
        if (response.status === 404) {
          // If the textId is not found, clear it and try again as a new text
          console.warn('Text ID not found, creating new text')
          setTextId(null)
          // Retry without textId
          const retryResponse = await fetch(`${SERVER_URL}/api/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ text: newText }),
          })

          if (!retryResponse.ok) {
            throw new Error(`Error syncing: ${await retryResponse.text()}`)
          }

          const data = await retryResponse.json()
          setTextId(data.textId) // Store the new textId
        } else {
          throw new Error(`Error syncing: ${await response.text()}`)
        }
      } else {
        const data = await response.json()
        if (!textId && data.textId) {
          setTextId(data.textId) // Store the textId if we didn't have one
        }
      }

      // After successful sync, fetch updated notes
      const notesResponse = await fetch(`${SERVER_URL}/api/get_all_texts`, {
        credentials: 'include',
      })
      const notesData = await notesResponse.json()
      if (Array.isArray(notesData)) {
        setNotes(notesData)
      }
    } catch (error) {
      console.error('Error syncing with server:', error)
    }
  }, [textId])

  const applyPromptResponse = useCallback((promptResponse: string) => {
    const caretPosition = textAreaRef.current?.selectionEnd || 0
    const newText =
      text.substring(0, caretPosition) +
      "\n" +
      promptResponse +
      text.substring(caretPosition)
    setText(newText)
    syncTextWithServer(newText)
  }, [text, syncTextWithServer])

  // Fetch suggestions for a new text contribution from the server, to insert between the before and after text
  const fetchPromptResponse = useCallback(async (context: string, prompt: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${SERVER_URL}/api/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ context, prompt }),
      })
      const data = await response.json()
      if (!response.ok) {
        console.error('Error from server:', data.error)
        return
      }

      applyPromptResponse(data.promptResponse)
    } catch (error) {
      console.error('Error fetching prompt responses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [applyPromptResponse])

  const handlePromptRequest = useCallback(() => {
    const prompt = text.substring(selection.start, selection.end)
    fetchPromptResponse(text, prompt)
  }, [text, fetchPromptResponse, selection.start, selection.end])

  // Update the text state and sync it to the server, with a debounce
  const updateText = useCallback((newText: string) => {
    setUndoStack([...undoStack, text])
    setRedoStack([]) // Clear redo stack when new changes are made
    setText(newText)

    // Clear any existing debouncer timeout
    if (syncTimeout) {
      clearTimeout(syncTimeout)
    }

    // Set new timeout for syncing
    const timeout = setTimeout(() => {
      syncTextWithServer(newText)
    }, 2000)

    setSyncTimeout(timeout)
  }, [text, undoStack, syncTimeout, syncTextWithServer])

  const clearAIContributions = useCallback(() => {
    setRephrases([])
    setReflection('')
  }, [])

  const clearText = useCallback(() => {
    setUndoStack([])
    setRedoStack([])
    setText('')
    setTextId(null)
    clearAIContributions()
  }, [clearAIContributions])

  const createNewText = useCallback(async (newText: string) => {
    const newTextButton = document.querySelector('.new-text-button') as HTMLButtonElement | null;
    if (newTextButton) {
      newTextButton.blur();
    }

    if (newText.trim() === '') {
      return
    }

    if (syncTimeout) {
      clearTimeout(syncTimeout)
      setSyncTimeout(null)
    }

    // Sync empty text with server to get new UUID
    await syncTextWithServer(newText)

    clearText()
  }, [clearText, syncTextWithServer, syncTimeout])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if (e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }

    // Check for a chord of ctrl+shift+i
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      handlePromptRequest()
    }
  }

  const handleNoteClick = async (noteId: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/get_text/${noteId}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (data.text !== null) {
        setText(data.text)
        setTextId(data.textId)
      }
    } catch (error) {
      console.error('Error loading note:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/delete_text/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      if (textId === noteId) {
        clearText()
      }

      // Reuse fetchNotes to reload all notes
      fetchNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  ////////////////////////////////////////////////////////
  // useEffect Hooks
  ////////////////////////////////////////////////////////

  // Fetch the latest text on component mount
  useEffect(() => {
    const fetchLatestText = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/get_latest`, {
          credentials: 'include',
        })
        const data = await response.json()
        if (data.text) {
          setText(data.text)
          setTextId(data.textId)
        }
      } catch (error) {
        console.error('Error fetching latest text:', error)
      }
    }

    fetchLatestText()
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [])

  // Add cleanup effect for sync timeout
  useEffect(() => {
    return () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout)
      }
    }
  }, [syncTimeout])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.options-popover') && !target.closest('.options-popover')) {
        setShowActions(false);
        clearAIContributions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [clearAIContributions]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearAIContributions()
        setShowActions(false)
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [clearAIContributions, setShowActions]);

  return (
    <>
      <div className="app-container">
        <div className="top-group">
          {/* App Header*/}
          <h1 className="app-title-header">Clarity</h1>

          {/* Editor */}
          <div className="editor-container">
            <div className="editor-header">
              <div className="note-id-display">ID: {textId ?? 'No Note ID'}</div>
              <button
                onClick={() => createNewText(text)}
                className="new-text-button"
              >
                New
              </button>
            </div>

            <textarea
              ref={textAreaRef}
              value={text}
              onChange={(e) => updateText(e.target.value)}
              onSelect={handleSelect}
              onKeyDown={handleKeyDown}
              className={`text-editor ${isLoading ? 'loading' : ''}`}
              placeholder="Start typing..."
            />

            {reflection && <div className="reflection-container">{reflection}</div>}

            {showActions && (
              <div className="options-popover">
                <div className="option-item" onClick={() => handleActionClick('rephrase')}>
                  Rephrase
                </div>
                <div className="option-item" onClick={() => handleActionClick('reflect')}>
                  Reflect
                </div>
                <div className="option-item" onClick={() => handleActionClick('prompt')}>
                  Prompt
                </div>
              </div>
            )}

            {rephrases.length > 0 && (
              <div className="options-popover">
                {rephrases.map((rephrase, index) => (
                  <div
                    key={index}
                    className="option-item"
                    onClick={() => applySuggestion(rephrase)}
                  >
                    {rephrase}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Notes */}
        <div className="bottom-group">
          <div className="notes-grid">
            {notes.map((note) => {
              return (
                <div
                  key={note.id}
                  className="note-icon"
                  onClick={() => handleNoteClick(note.id)}
                >
                  <div className="note-icon-header-container">
                    <div className="note-icon-id">
                      {note.id.slice(0, 8)}
                      {note.id.length > 8 ? '...' : ''}
                    </div>
                    <svg
                      className="delete-note-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNote(note.id)
                      }}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 448 512">
                      {/* License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc. */}
                      <path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z" />
                    </svg>
                  </div>
                  <div className="note-icon-text">{note.text}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export default App;
