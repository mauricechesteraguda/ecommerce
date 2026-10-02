// setup-10022026-Maurice: browser-safe session trace; operational traces remain outside the repository.
// feature-10022026-Maurice: browser operations retain the same enter/exit/error contract as backend operations.
export async function trace<T>(name: string, operation: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== "production") console.debug(JSON.stringify({ event: "enter", name, timestamp: new Date().toISOString() }))
  try {
    const result = await operation()
    if (process.env.NODE_ENV !== "production") console.debug(JSON.stringify({ event: "exit", name, timestamp: new Date().toISOString() }))
    return result
  } catch (error) {
    console.error(JSON.stringify({ event: "exception", name, error: error instanceof Error ? error.message : "unknown" }))
    throw error
  }
}

export function traceSync<T>(name: string, operation: () => T): T {
  if (process.env.NODE_ENV !== "production") console.debug(JSON.stringify({ event: "enter", name, timestamp: new Date().toISOString() }))
  try { const result = operation(); if (process.env.NODE_ENV !== "production") console.debug(JSON.stringify({ event: "exit", name, timestamp: new Date().toISOString() })); return result }
  catch (error) { console.error(JSON.stringify({ event: "exception", name, error: error instanceof Error ? error.message : "unknown" })); throw error }
}
