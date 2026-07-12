/**
 * Page Agent initialization module.
 *
 * Embeds an AI copilot in the CRM web app.
 * Users can use natural language to operate the interface.
 *
 * Usage in a React component:
 *   import { usePageAgent } from "@/lib/page-agent"
 *   const { execute, isReady } = usePageAgent()
 *   await execute("创建新订单，客户 ABC Corp")
 *
 * Standalone usage:
 *   import { getPageAgent } from "@/lib/page-agent"
 *   const agent = await getPageAgent()
 *   await agent.execute("点击设置按钮")
 */
import { PageAgent } from "page-agent"

export type PageAgentConfig = {
  model?: string
  baseURL?: string
  apiKey?: string
  language?: string
  promptForNextTask?: boolean
}

const DEFAULT_CONFIG: PageAgentConfig = {
  model: process.env.NEXT_PUBLIC_PAGE_AGENT_MODEL || "qwen3.5-plus",
  baseURL:
    process.env.NEXT_PUBLIC_PAGE_AGENT_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: process.env.NEXT_PUBLIC_PAGE_AGENT_API_KEY || "",
  language: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "zh-CN",
  promptForNextTask: true,
}

let _agent: PageAgent | null = null

/**
 * Get or create the single PageAgent instance.
 * Reuses the same instance across the app.
 */
export async function getPageAgent(
  config?: Partial<PageAgentConfig>,
): Promise<PageAgent> {
  if (!_agent) {
    const merged = { ...DEFAULT_CONFIG, ...config }
    if (typeof window === "undefined") {
      throw new Error("PageAgent can only be initialized on the client side")
    }
    _agent = new PageAgent(merged)
  }
  return _agent
}

/**
 * React hook for using Page Agent in components.
 *
 * ```tsx
 * function AIAssistant() {
 *   const { execute, isReady, error } = usePageAgent()
 *   return (
 *     <div>
 *       <input onKeyDown={e => execute(e.currentTarget.value)} />
 *       {error && <p className="text-red-500">{error}</p>}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePageAgent(config?: Partial<PageAgentConfig>) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const agentRef = useRef<PageAgent | null>(null)

  useEffect(() => {
    getPageAgent(config)
      .then((agent) => {
        agentRef.current = agent
        setIsReady(true)
      })
      .catch((e) => setError(e.message))
  }, [])

  const execute = useCallback(async (instruction: string) => {
    if (!agentRef.current) {
      throw new Error("PageAgent not initialized")
    }
    return agentRef.current.execute(instruction)
  }, [])

  return { execute, isReady, error }
}

/**
 * Execute a single natural language instruction.
 * Convenience wrapper for one-off calls.
 */
export async function executeInstruction(
  instruction: string,
  config?: Partial<PageAgentConfig>,
) {
  const agent = await getPageAgent(config)
  return agent.execute(instruction)
}

export type { PageAgent }
