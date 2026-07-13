/**
 * Page Agent module — stub (feature disabled).
 */

export type PageAgentConfig = {
  model?: string
  baseURL?: string
  apiKey?: string
  language?: string
  promptForNextTask?: boolean
}

export async function getPageAgent(
  _config?: Partial<PageAgentConfig>,
): Promise<never> {
  throw new Error("PageAgent is disabled")
}

export function usePageAgent(_config?: Partial<PageAgentConfig>) {
  return {
    execute: async (_instruction: string) => {
      throw new Error("PageAgent is disabled")
    },
    isReady: false,
    error: "PageAgent is disabled",
  }
}

export async function executeInstruction(
  _instruction: string,
  _config?: Partial<PageAgentConfig>,
): Promise<never> {
  throw new Error("PageAgent is disabled")
}
