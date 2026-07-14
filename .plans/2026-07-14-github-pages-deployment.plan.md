# GitHub Pages Deployment Plan

Deploy the Nulo Cake Astro site to GitHub Pages from the `githubpages` branch only. Pushes to `main` must never trigger a deployment.

## Target Outcome

| Item | Value |
|---|---|
| Repository | [astanula/nulocake](https://github.com/astanula/nulocake) |
| Deploy branch | `githubpages` only |
| Live URL | `https://astanula.github.io/nulocake/` |
| Build tool | GitHub Actions (`withastro/action@v3`) |
| Package manager | npm (`package-lock.json`) |
| Node version | 22 (`package.json` requires `>=22.12.0`) |

## Current State

- Local branch `githubpages` exists; remote `origin/githubpages` does not exist yet.
- `astro.config.mjs` has no `site` or `base` configured.
- No `.github/workflows/deploy.yml` exists.
- Internal links use root-absolute paths (`href="/oferta"`, etc.) — these will 404 on GitHub Pages without a `base` and link fixes.
- Layout uses `ClientRouter` (`astro:transitions`) — requires correct `base` config.
- E2E tests hardcode root-absolute `href` selectors; out of scope for initial deploy (local dev unaffected).

## Execution Progress Checklist

- [x] Phase 1: Astro config (`site`, `base`)
- [x] Phase 2: `withBase` helper + internal link fixes
- [x] Phase 3: GitHub Actions workflow
- [x] Phase 4: GitHub repo settings (manual)
- [x] Phase 5: Push and verify deployment
- [x] Phase 6: Establish ongoing publish workflow

---

## Phase 1: Astro Config

* **DependsOn:** None
* **Objective:** Astro resolves asset paths and routing correctly under the `/nulocake/` subpath.
* **Implementation Steps:**
  * [ ] Step 1: Add `site` and `base` to `astro.config.mjs`:

    ```javascript
    export default defineConfig({
      site: 'https://astanula.github.io',
      base: '/nulocake',
      // ...existing server/vite config
    });
    ```

* **Convention:**
  * `base` in config: **no trailing slash** → `'/nulocake'`
  * `import.meta.env.BASE_URL` at runtime: **with trailing slash** → `'/nulocake/'`
  * Local dev will be served at `http://127.0.0.1:4321/nulocake/` — expected behavior.

---

## Phase 2: `withBase` Helper + Internal Link Fixes

* **DependsOn:** Phase 1
* **Objective:** All navigation and asset references work on GitHub Pages subpath hosting.
* **Implementation Steps:**
  * [ ] Step 1: Create `src/utils/withBase.ts`:

    ```typescript
    export const withBase = (path: string) =>
      `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
    ```

  * [ ] Step 2: Update `src/layouts/Layout.astro` — favicon links:

    ```astro
    <link rel="icon" type="image/svg+xml" href={withBase('favicon.svg')} />
    <link rel="icon" href={withBase('favicon.ico')} />
    ```

  * [ ] Step 3: Update `src/components/Navigation.astro` — all `href` attributes and the JS `querySelector` for home link.
  * [ ] Step 4: Update `src/components/Footer.astro` — logo/home link.
  * [ ] Step 5: Update page links:
    * `src/pages/index.astro` (5 links)
    * `src/pages/oferta.astro` (5 links)
    * `src/pages/kontakt.astro` (1 link)
    * `src/pages/o-mnie.astro` (1 link)
  * [ ] Step 6: For home page links, use `import.meta.env.BASE_URL` directly (clearest for root):

    ```astro
    <a href={import.meta.env.BASE_URL}>Home</a>
    ```

* **Link pattern:**

    ```astro
    ---
    import { withBase } from '../utils/withBase';
    ---
    <a href={withBase('oferta')}>Oferta</a>
    <a href={withBase('/oferta')}>Oferta</a>  <!-- both resolve to /nulocake/oferta -->
    ```

* **Out of scope (initial deploy):** E2E test selector updates in `tests/e2e/`. Tests run against local dev without base path concerns for now.

---

## Phase 3: GitHub Actions Workflow

* **DependsOn:** Phase 1, Phase 2
* **Objective:** Every push to `githubpages` builds and deploys the site automatically.
* **Implementation Steps:**
  * [ ] Step 1: Create `.github/workflows/deploy.yml`:

    ```yaml
    name: Deploy to GitHub Pages

    on:
      push:
        branches: [githubpages]
      workflow_dispatch:

    permissions:
      contents: read
      pages: write
      id-token: write

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout your repository using git
            uses: actions/checkout@v4

          - name: Install, build, and upload your site
            uses: withastro/action@v3
            with:
              node-version: 22

      deploy:
        needs: build
        runs-on: ubuntu-latest
        environment:
          name: github-pages
          url: ${{ steps.deployment.outputs.page_url }}
        steps:
          - name: Deploy to GitHub Pages
            id: deployment
            uses: actions/deploy-pages@v4
    ```

* **Key decisions:**
  * Trigger branch: `githubpages` only — `main` is intentionally excluded.
  * `workflow_dispatch` included for manual re-deploy from Actions tab.
  * `node-version: 22` matches `package.json` engines requirement.

---

## Phase 4: GitHub Repo Settings (Manual)

* **DependsOn:** Phase 3 (workflow must exist in repo before first push)
* **Objective:** GitHub Pages expects deployments via Actions, not a static branch.
* **Steps (one-time, in browser):**
  * [ ] Step 1: Go to [github.com/astanula/nulocake/settings/pages](https://github.com/astanula/nulocake/settings/pages)
  * [ ] Step 2: Under **Build and deployment → Source**, select **GitHub Actions**
  * [ ] Step 3: Save — no branch selection needed when using Actions

---

## Phase 5: Push and Verify

* **DependsOn:** Phase 1–4
* **Objective:** First successful deployment to `https://astanula.github.io/nulocake/`.
* **Implementation Steps:**
  * [ ] Step 1: Commit all changes on `githubpages` branch
  * [ ] Step 2: Push branch to remote: `git push -u origin githubpages`
  * [ ] Step 3: Open **Actions** tab → confirm "Deploy to GitHub Pages" workflow runs and succeeds
  * [ ] Step 4: Visit `https://astanula.github.io/nulocake/` and verify:
    * Home page loads with correct styles and assets
    * Navigation links work (Oferta, Galeria, O mnie, Kontakt)
    * View transitions work between pages
    * Favicon loads

---

## Phase 6: Ongoing Publish Workflow

* **DependsOn:** Phase 5
* **Objective:** Clear day-to-day process for publishing updates.

```
main (development)  →  merge into githubpages  →  push  →  auto-deploy
```

* **Rules:**
  * Develop features on `main` (or feature branches merged into `main`)
  * When ready to publish, merge `main` into `githubpages` and push
  * Every push to `githubpages` triggers a new deployment
  * Never add `main` to the workflow trigger branches

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Nav links 404 on Pages | Phase 2: `withBase` on all internal links |
| Assets 404 (CSS, images, favicon) | Phase 1: `base: '/nulocake'` in config |
| View transitions break cross-page | Phase 1 + Phase 2: correct `base` and link prefixes |
| Workflow uses wrong Node version | Phase 3: `node-version: 22` in action |
| Branch not on GitHub yet | Phase 5: first push with `-u origin githubpages` |
| Double slashes in URLs | `withBase` strips leading `/` from path argument |

---

## Verification Plan

### Manual (post-deploy)
- [x] Home page renders at `https://astanula.github.io/nulocake/`
- [ ] All nav links navigate correctly
- [ ] GSAP scroll animations work on home page
- [ ] Gallery page loads images
- [ ] Favicon visible in browser tab

### Local (pre-push)
- [x] `npm run build` succeeds
- [ ] `npm run preview` serves site at `http://localhost:4321/nulocake/`
- [ ] Navigation works in preview mode

### Out of scope (future)
- [ ] E2E test updates for base-path-aware selectors
- [ ] Custom domain configuration
- [ ] CI E2E run against preview with `/nulocake` base
