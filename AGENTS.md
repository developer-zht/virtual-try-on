# Repository guidance

## Canonical 3D documentation

The only authoritative copies of the 3D product and architecture documents live on the remote branch `claude/docs-hub`.

For any task involving 3D try-on, body sculpting, WebGL2, three.js, glTF/GLB, morph targets, UVs, textures, 3D assets, Providers, `tryon3d-core`, `app-standalone`, pnpm workspaces, the Monorepo transition, or migration of the Web 3D implementation toward native iOS:

1. Refresh the canonical documentation ref without switching branches, merging, rebasing, or pulling:

   ```bash
   git fetch origin refs/heads/claude/docs-hub:refs/remotes/origin/claude/docs-hub
   ```

2. Resolve and report the exact documentation commit used:

   ```bash
   git rev-parse refs/remotes/origin/claude/docs-hub
   ```

3. Read both documents completely from that ref:

   ```bash
   git show refs/remotes/origin/claude/docs-hub:docs/ARCH-CHANGE-monorepo-3d.md
   git show refs/remotes/origin/claude/docs-hub:docs/SRS-3D-tryon-web.md
   ```

Use the documents as follows:

- The SRS defines product scope, requirements, constraints, exclusions, and acceptance criteria.
- The architecture-change document defines the target repository structure, sharing boundaries, and Provider seams.
- The checked-out working tree defines the current implementation state. Do not assume that a proposed directory or Monorepo structure already exists.

Before making 3D or Monorepo-related changes:

1. Identify the applicable `FR-*`, `NFR-*`, and `C-*` requirements.
2. Identify the current `M0` through `M5` milestone.
3. State whether the change belongs to `app/`, `packages/tryon3d-core/`, or `app-standalone/`.
4. Distinguish the checked-out implementation state from the documented target state.
5. Preserve the existing 2D application unless the task explicitly requires changing or migrating it.

Do not treat copies of these documents on other branches as authoritative.

If the canonical branch cannot be fetched or either document cannot be read, stop and report the problem instead of using a stale copy or relying on memory.

If the documents conflict with each other or with the checked-out implementation, report the conflict before implementation instead of silently choosing one interpretation.

Tasks unrelated to 3D try-on or the Monorepo transition do not need to load these documents.
