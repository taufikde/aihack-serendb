import type { ChatModelAdapter, ChatModelRunOptions } from '@assistant-ui/react'

type ApiMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

type ChatResponse = {
  message?: string
  response?: string
  output?: string
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/chat'

const getTextContent = (message: ChatModelRunOptions['messages'][number]) =>
  message.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')

export const roles = ['Employee', 'Manager', 'Team Lead'] as const

export type Role = (typeof roles)[number]

// Temporary: the mock reply mentions the role picked in the composer.
let mockRole: Role | null = null

export const setMockRole = (role: Role | null) => {
  mockRole = role
}

export const mockChatModel: ChatModelAdapter = {
  async run({ abortSignal }) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    if (abortSignal.aborted) throw new Error('Request was cancelled.')

    const text = mockRole
      ? `Hardcoded reply for the ${mockRole} role. The real API will answer here later.`
      : 'Hardcoded reply. The real API will answer here later.'

    return {
      content: [{ type: 'text', text }],
      status: { type: 'complete', reason: 'stop' },
    }
  },
}

export const fastApiChatModel: ChatModelAdapter = {
  async run({ messages, abortSignal }) {
    const apiMessages: ApiMessage[] = messages
      .filter(
        (message): message is typeof message & { role: ApiMessage['role'] } =>
          message.role === 'user' ||
          message.role === 'assistant' ||
          message.role === 'system',
      )
      .map((message) => ({
        role: message.role,
        content: getTextContent(message),
      }))

    const latestMessage = apiMessages.at(-1)
    if (!latestMessage?.content.trim()) {
      throw new Error('Please enter a message before sending.')
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: latestMessage.content,
        messages: apiMessages,
      }),
      signal: abortSignal,
    })

    if (!response.ok) {
      let detail = `Request failed with status ${response.status}.`
      try {
        const errorBody = (await response.json()) as { detail?: string }
        if (errorBody.detail) detail = errorBody.detail
      } catch {
        // Keep the HTTP status when the API does not return JSON.
      }
      throw new Error(detail)
    }

    const data = (await response.json()) as ChatResponse
    const message = data.message ?? data.response ?? data.output
    if (!message?.trim()) {
      throw new Error('The API returned an empty response.')
    }

    return {
      content: [{ type: 'text', text: message }],
      status: { type: 'complete', reason: 'stop' },
    }
  },
}
