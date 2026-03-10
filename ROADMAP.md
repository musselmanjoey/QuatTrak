# QuatTrak — Future Roadmap

## What We Have Today (v4)
- Multi-court support with independent sessions
- Kiosk view (iPad on net) + Mobile view (phone)
- Check-in, auto/manual team generation, same-teams replay
- Drag-and-drop team editing
- Global Elo system (K=32, 1200 default)
- Leaderboard + per-player match history
- **Tournament system v1** — single elimination and round robin
  - TO flow: create tournament, manage teams, generate bracket, assign courts, inline score entry
  - Player flow: join, bracket view, my matches, score reporting
  - Elo updates per tournament match with full snapshot history
  - Supports 16+ teams at scale
- Deployed: Vercel + Railway Postgres

---

## Next Up: Tournament Improvements

### Auth & Permissions
- **Player identity on mobile** — lightweight login (name + PIN, or Discord OAuth) so players don't have to re-identify each tournament
- **TO-only Admin tab** — hide Admin tab from non-organizers (check localStorage player ID against `organizer_player_id`)
- **Co-organizers** — allow TO to grant admin access to helpers

### Tournament UI Polish
- **Tournament list filtering** — tabs for Active / Completed / Setup
- **Tournament detail header** — show format, team size, organizer consistently across all tournament pages
- **Bracket connectors** — CSS lines connecting matches across rounds in the bracket view
- **Auto-refresh** — poll for match updates so bracket/standings stay current without manual refresh
- **Better mobile bracket** — sticky round headers during horizontal scroll

### Pools → Bracket Flow
- **Pool play** — round robin pools (groups of 4-6 teams), then top teams advance to single elimination
- **Pool configuration** — TO sets number of pools, teams auto-distributed by seed
- **Advancement rules** — top N from each pool advance, re-seeded for bracket
- **Combined tournament format** — single tournament with pool phase + bracket phase

### Team Features
- **Established team pairs** — players who always play together can register as a duo
- **Team registration** — players form their own teams instead of TO assigning
- **Free agent pool** — solo players get auto-paired into teams

---

## Priority Ideas (From Joey)

### Discord Integration
- **Player sync** — auto-populate QuatTrak player database from Discord server members
- **Discord bot** possibilities:
  - Check in to a session via bot command
  - Match results posted to a channel automatically
  - Leaderboard command (`/leaderboard`)
  - Notifications when games are generated ("Your game is up on Court 2")
  - Session summary posted at end of day

---

## Gameplay & Stats
- **Win streaks / hot hand** — highlight players on a streak in the UI
- **Head-to-head records** — "You're 3-7 against Joey"
- **Session summary** — end-of-day recap: games played, biggest Elo movers, MVPs
- **Elo history graph** — per-player rating over time chart
- **Score tracking** — actual game scores in pickup, not just win/loss

## Court Experience
- **Sit-out rotation** — auto-track who's been sitting longest, prioritize them in next matchmaking
- **Court status live view** — mobile users see real-time "Game 4 in progress" on each court
- **Timer / clock** — optional game timer on the kiosk display

## Social / Engagement
- **Player profiles** — photo, bio, favorite partner, stats dashboard
- **Push notifications** — "Your game is up on Court 2"
- **Achievements / badges** — first win, 10-game streak, comeback king, etc.

## Elo System Improvements
- **Provisional K-factor** — K=64 for first ~15 games, K=32 after. Gets new players to true rating faster.
- **K scaled by team size** — K=32 for 2v2, K=24 for 3v3, K=20 for 4v4. Less individual signal in bigger teams = smaller swings.
- **Confidence badge** — show "provisional" on new players so people understand volatile ratings
- **Separate ratings by format** — independent 2v2 / 4v4 Elo if skills don't transfer equally
- **TrueSkill or Glicko-2** — advanced systems designed for team games, track skill + uncertainty per player. Gold standard for matchmaking but more complex to implement.

## Infrastructure
- **Real-time updates** (SSE or WebSocket) — kiosk and mobile stay in sync without manual refresh
- **Auth** — lightweight (PIN per court kiosk, player login on mobile, or Discord OAuth)
- **PWA install** — add-to-homescreen for iPad kiosk (fullscreen, no Safari chrome)
- **Data export** — CSV dump of all matches for stat analysis
