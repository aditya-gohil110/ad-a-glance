cat > README.md << 'EOF'
# Ad a glance

A cross-platform advertising performance dashboard built with React and TypeScript. Tracks spend, reach, and conversions across Meta (Facebook and Instagram), Google, and LinkedIn from a single interface.

## Live Demo

https://aditya-gohil110.github.io/ad-a-glance/

Alternate deployment (Netlify): https://dynamic-semifreddo-264bce.netlify.app/

No installation is required to review this project. The link above is a fully functional, deployed build. The setup instructions further down are provided only for anyone who wants to run the project locally.

## Tech Stack

- React 18 with TypeScript
- Vite
- react-router-dom for client-side routing
- styled-components for styling
- Recharts for data visualization
- PapaParse for CSV export

## Running Locally (Optional)

npm install
npm run dev

The app runs at `http://localhost:5173`.

To build for production:

npm run build

## Features

### Overview dashboard

- Summary cards for all four platforms (Facebook, Instagram, Google, LinkedIn), each showing current spend, impressions, clicks, and period-over-period change.
- A 30-day spend sparkline embedded in each card.
- A consolidated chart plotting spend for all four platforms over the last 30 days.
- An automatically generated insight identifying the most cost-efficient platform this period, based on cost per conversion, with its change versus the previous period.
- A CSV export covering all four platforms' current totals and deltas in one file.
- The dashboard uses a fixed 30-day window with no date controls, matching the `/v1/metrics-summary` endpoint's contract. Custom date ranges are handled on the individual platform pages instead, to avoid duplicating that control on the overview.

### Platform detail pages

One page per network: Meta, Google, and LinkedIn, each with:

- A custom date range picker (7 to 30 days), with human-readable date confirmations shown beneath the native inputs.
- KPI cards for spend, impressions, clicks, and conversions, each with a percentage change against the previous period.
- A trend chart combining a filled area for the current period with a dashed overlay for the previous period, so the comparison is visible as a shape, not only as a number.
- A CSV export that reflects exactly what's on screen: the selected network, the selected Meta sub-view, and the selected date range.
- Inline error handling for invalid date ranges: an error banner appears with a button that reverts to the last successfully loaded range, without requiring a page refresh. The date controls remain interactive throughout.
- Loading states that mirror the final layout rather than a blank screen.

The Meta page additionally includes a Combined / Facebook / Instagram toggle (see Design Decisions below), synced to the URL so a specific view is shareable as a link.

### Design

A dark, high-contrast theme ("Billboard") built around magenta and cyan accents, referencing out-of-home advertising. Space Grotesk is used for headings, Inter for body text, and IBM Plex Mono for all numeric figures, so tabular data reads distinctly from prose. Each platform is assigned a consistent accent color across the dashboard cards, chart lines, and detail page headers.

## Design Decisions

### Meta network: Facebook and Instagram

The specification references `/v1/metrics-insights?network=meta` without documenting a sample response for it. Testing the live endpoint showed that it returns Facebook and Instagram as fully separate objects at every level of the response (`totals`, `previousTotals`, and `dailyData`), and that the two platforms don't share the same set of fields: Facebook includes `shares`, Instagram includes `saves`, and neither is present on the other.

Given that, the Meta page combines the two platforms only for metrics they genuinely share (spend, impressions, clicks, conversions), recalculating `ctr` and `cpc` from the summed totals rather than averaging the two platforms' rates, consistent with the API's own documented approach to rate fields. Platform-specific engagement metrics are not merged, since they aren't the same metric to begin with.

Because collapsing the two platforms into one number also hides real differences between them, the page includes a Combined / Facebook / Instagram toggle. The chart, KPI cards, and CSV export all update to reflect whichever view is selected.

## Project Structure

src/
api/
client.ts        API layer: typed fetch wrappers for both endpoints
pages/
Dashboard.tsx     Overview page
NetworkDetailPage.tsx   Shared page for Meta, Google, and LinkedIn
types.ts            Response types for both endpoints
theme.ts            Color, font, and spacing tokens
GlobalStyle.ts       Global CSS reset and base styles
App.tsx              Routing and navigation

## API

Base URL: `https://eulerity-hackathon.appspot.com`

- `GET /v1/metrics-summary` — fixed 30-day rolling summary across all platforms, used by the dashboard.
- `GET /v1/metrics-insights?network={meta|google|linkedin}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — used by the detail pages. Date range must be between 7 and 30 days.

## Deployment

Deployed to two platforms:

- GitHub Pages, built via `gh-pages` from the `dist` output. Client-side routes are preserved on direct navigation and page refresh through a redirect in `404.html` that GitHub Pages serves for any unmatched path, decoded back into the correct route before the app mounts.
- Netlify, built separately with the base path set to root (`vite build --base=/`) rather than the `/ad-a-glance/` subpath GitHub Pages requires, since Netlify serves from the domain root. Client-side routing is preserved via a `_redirects` rule rather than the GitHub Pages workaround, since Netlify supports SPA fallback natively.

## Known Limitations

- The previous-period comparison line on each detail chart requires a second API call. If that call fails, the chart simply omits the comparison line rather than blocking the page.
- The native date input's calendar display format follows the browser and operating system locale and cannot be overridden without replacing it with a custom date picker component. The date confirmation text beneath each input is provided as an unambiguous alternative.
