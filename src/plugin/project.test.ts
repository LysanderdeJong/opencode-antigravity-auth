import { beforeEach, describe, expect, it, vi } from "vitest"

import { ensureProjectContext, invalidateProjectContextCache, loadManagedProject } from "./project"
import type { OAuthAuthDetails } from "./types"

describe("project context resolution", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    invalidateProjectContextCache()
  })

  it("sends PLATFORM_UNSPECIFIED to loadCodeAssist", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ cloudaicompanionProject: { id: "managed-123" } }), {
        status: 200,
      })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    await loadManagedProject("access-token", "project-123")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(init.body)) as {
      metadata: {
        platform: string
        duetProject?: string
      }
    }
    expect(body.metadata.platform).toBe("PLATFORM_UNSPECIFIED")
    expect(body.metadata.duetProject).toBe("project-123")
  })

  it("persists the resolved managed project in refresh state", async () => {
    const auth: OAuthAuthDetails = {
      type: "oauth",
      refresh: "refresh-token|project-123",
      access: "access-token",
      expires: Date.now() + 60_000,
    }
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ cloudaicompanionProject: { id: "managed-123" } }), {
        status: 200,
      })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await ensureProjectContext(auth)

    expect(result.effectiveProjectId).toBe("managed-123")
    expect(result.auth.refresh).toBe("refresh-token|project-123|managed-123")
  })
})
