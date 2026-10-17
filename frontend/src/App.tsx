import { useEffect, useRef, useState } from 'react'
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  useLocalRuntime,
  useRemoteThreadListRuntime,
} from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  LayoutDashboard,
  PanelLeft,
  Plus,
  RefreshCw,
  SquarePen,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { mockChatModel, roles, setMockRole, type Role } from './chat-api'
import { createThreadListAdapter } from './thread-list-adapter'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import './App.css'

const APP_NAME = 'Seren'
const MOBILE_QUERY = '(max-width: 768px)'

const threadListAdapter = createThreadListAdapter()

const MarkdownText = () => <MarkdownTextPrimitive className="markdown" />

const CopyButton = () => (
  <ActionBarPrimitive.Copy className="action-button" aria-label="Copy">
    <Copy className="action-icon-idle" />
    <Check className="action-icon-done" />
  </ActionBarPrimitive.Copy>
)

const ThinkingIndicator = () => {
  const isWaiting = useAuiState(
    (state) => state.message.status?.type === 'running' && state.message.parts.length === 0,
  )

  if (!isWaiting) return null

  return (
    <div className="thinking-indicator" role="status" aria-live="polite">
      <span className="thinking-pulse" aria-hidden="true" />
      Thinking
    </div>
  )
}

const UserMessage = () => (
  <MessagePrimitive.Root className="message message-user">
    <div className="message-user-bubble">
      <MessagePrimitive.Parts />
    </div>
    <ActionBarPrimitive.Root
      className="action-bar action-bar-user"
      hideWhenRunning
      autohide="never"
    >
      <CopyButton />
    </ActionBarPrimitive.Root>
  </MessagePrimitive.Root>
)

const AssistantMessage = () => (
  <MessagePrimitive.Root className="message message-assistant">
    <div className="message-assistant-body">
      <ThinkingIndicator />
      <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="message-error">
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </div>
    <ActionBarPrimitive.Root
      className="action-bar"
      hideWhenRunning
      autohide="never"
    >
      <CopyButton />
      <ActionBarPrimitive.Reload className="action-button" aria-label="Regenerate">
        <RefreshCw />
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  </MessagePrimitive.Root>
)

const DeleteThreadDialog = () => {
  const aui = useAui()

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="thread-list-delete"
            aria-label="Delete chat"
          >
            <Trash2 />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
          <AlertDialogDescription>
            This chat will be removed from your history. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void aui.threadListItem.delete()}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const ThreadListItem = () => (
  <ThreadListItemPrimitive.Root className="thread-list-item">
    <ThreadListItemPrimitive.Trigger className="thread-list-trigger">
      <ThreadListItemPrimitive.Title fallback="New chat" />
    </ThreadListItemPrimitive.Trigger>
    <DeleteThreadDialog />
  </ThreadListItemPrimitive.Root>
)

type View = 'chat' | 'dashboard'

type SidebarProps = {
  isOpen: boolean
  view: View
  onToggle: () => void
  onSelectView: (view: View) => void
}

const Sidebar = ({ isOpen, view, onToggle, onSelectView }: SidebarProps) => (
  <aside
    className={cn(
      'sidebar',
      !isOpen && 'sidebar-collapsed',
      view === 'dashboard' && 'sidebar-dashboard-view',
    )}
  >
    <div className="sidebar-top">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <span className="sidebar-label brand-name">{APP_NAME}</span>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={onToggle}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <PanelLeft />
      </button>
    </div>
    <ThreadListPrimitive.Root className="sidebar-content">
      <ThreadListPrimitive.New
        className="new-chat-button"
        aria-label="New chat"
        title="New chat"
        onClick={() => onSelectView('chat')}
      >
        <SquarePen />
        <span className="sidebar-label">New chat</span>
      </ThreadListPrimitive.New>
      <button
        type="button"
        className={cn('new-chat-button', view === 'dashboard' && 'sidebar-nav-active')}
        aria-label="Dashboard"
        aria-current={view === 'dashboard' ? 'page' : undefined}
        title="Dashboard"
        onClick={() => onSelectView('dashboard')}
      >
        <LayoutDashboard />
        <span className="sidebar-label">Dashboard</span>
      </button>
      <div
        className="thread-list-items"
        onClick={(event) => {
          // Only opening a chat counts; clicks from the delete dialog bubble here too.
          if ((event.target as Element).closest('.thread-list-trigger')) onSelectView('chat')
        }}
      >
        <p className="sidebar-section-label">Recents</p>
        <ThreadListPrimitive.Items components={{ ThreadListItem }} />
      </div>
    </ThreadListPrimitive.Root>
  </aside>
)

type RoleMenuProps = {
  role: Role | null
  onSelect: (role: Role) => void
}

const RoleMenu = ({ role, onSelect }: RoleMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="role-menu" ref={menuRef}>
      <button
        type="button"
        className="composer-tool"
        aria-label="Choose role"
        title="Choose role"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Plus />
      </button>
      {isOpen && (
        <div className="role-menu-popover">
          <p className="role-menu-heading">Answer as</p>
          <ul className="role-menu-list" role="menu">
            {roles.map((option) => (
              <li key={option} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={option === role}
                  className="role-menu-item"
                  onClick={() => {
                    onSelect(option)
                    setIsOpen(false)
                  }}
                >
                  <UserRound />
                  <span>{option}</span>
                  {option === role && <Check className="role-menu-check" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type ComposerProps = {
  role: Role | null
  onSelectRole: (role: Role) => void
  onClearRole: () => void
}

const Composer = ({ role, onSelectRole, onClearRole }: ComposerProps) => (
  <ComposerPrimitive.Root className="composer">
    <ComposerPrimitive.Input
      className="composer-input"
      placeholder={role ? `Message ${APP_NAME} as ${role}` : `Message ${APP_NAME}`}
      rows={1}
      autoFocus
    />
    <div className="composer-toolbar">
      <RoleMenu role={role} onSelect={onSelectRole} />
      {role && (
        <span className="role-chip">
          <UserRound />
          {role}
          <button type="button" onClick={onClearRole} aria-label="Remove role">
            <X />
          </button>
        </span>
      )}
      <div className="composer-actions">
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send className="composer-send" aria-label="Send message">
            <ArrowUp />
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel className="composer-send" aria-label="Stop generating">
            <span className="stop-square" aria-hidden="true" />
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </div>
    </div>
  </ComposerPrimitive.Root>
)

const ChatThread = (composerProps: ComposerProps) => (
  <ThreadPrimitive.Root className="chat-thread">
    <ThreadPrimitive.Viewport className="thread-viewport">
      <ThreadPrimitive.Empty>
        <div className="empty-state">
          <h1 className="empty-title">What&apos;s on your mind today?</h1>
          <Composer {...composerProps} />
        </div>
      </ThreadPrimitive.Empty>
      <div className="thread-messages">
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </div>
    </ThreadPrimitive.Viewport>
    <ThreadPrimitive.If empty={false}>
      <div className="thread-footer">
        <ThreadPrimitive.ScrollToBottom className="scroll-to-bottom" aria-label="Scroll to bottom">
          <ArrowDown />
        </ThreadPrimitive.ScrollToBottom>
        <Composer {...composerProps} />
        <p className="composer-hint">
          {APP_NAME} can make mistakes. Check important info.
        </p>
      </div>
    </ThreadPrimitive.If>
  </ThreadPrimitive.Root>
)

const DashboardComingSoon = () => (
  <section className="dashboard-placeholder">
    <div className="dashboard-icon" aria-hidden="true">
      <LayoutDashboard />
    </div>
    <h1 className="dashboard-title">Dashboard</h1>
    <span className="coming-soon-pill">Coming soon</span>
    <p className="dashboard-copy">
      Insights on questions asked by Employees, Managers and Team Leads will appear here.
    </p>
  </section>
)

const useMockChatRuntime = () => useLocalRuntime(mockChatModel)

function App() {
  const runtime = useRemoteThreadListRuntime({
    adapter: threadListAdapter,
    runtimeHook: useMockChatRuntime,
  })
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !window.matchMedia(MOBILE_QUERY).matches)
  const [role, setRole] = useState<Role | null>(null)
  const [view, setView] = useState<View>('chat')

  // The sidebar starts open on desktop and closed on mobile, and resets when crossing the breakpoint.
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const handleChange = () => {
      setIsMobile(query.matches)
      setIsSidebarOpen(!query.matches)
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  const toggleSidebar = () => setIsSidebarOpen((open) => !open)

  // On small screens the sidebar is an overlay, so close it after navigating.
  const selectView = (next: View) => {
    setView(next)
    if (isMobile) setIsSidebarOpen(false)
  }

  const selectRole = (next: Role) => {
    setRole(next)
    setMockRole(next)
  }

  const clearRole = () => {
    setRole(null)
    setMockRole(null)
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="app-shell">
        <Sidebar
          isOpen={isSidebarOpen}
          view={view}
          onToggle={toggleSidebar}
          onSelectView={selectView}
        />
        {isMobile && isSidebarOpen && (
          <div className="sidebar-backdrop" onClick={toggleSidebar} aria-hidden="true" />
        )}
        <main className="chat-main">
          <header className="chat-header">
            <button
              type="button"
              className="icon-button chat-header-toggle"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <PanelLeft />
            </button>
            <span className="chat-header-title">
              {view === 'dashboard' ? 'Dashboard' : APP_NAME}
            </span>
          </header>
          {view === 'chat' ? (
            <ChatThread role={role} onSelectRole={selectRole} onClearRole={clearRole} />
          ) : (
            <DashboardComingSoon />
          )}
        </main>
      </div>
    </AssistantRuntimeProvider>
  )
}

export default App
