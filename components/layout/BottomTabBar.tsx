'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const checkInIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const matchesIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const leaderboardIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const courtsIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

const backIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const tournamentIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h7v7H3z" />
    <path d="M14 3h7v7h-7z" />
    <path d="M3 14h7v7H3z" />
    <path d="M14 14h7v7h-7z" />
    <path d="M10 6.5h4" />
    <path d="M12 6.5v11" />
    <path d="M6.5 10v4" />
    <path d="M17.5 10v4" />
  </svg>
);

const bracketIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h7v5H3z" />
    <path d="M3 16h7v5H3z" />
    <path d="M14 9.5h7v5h-7z" />
    <path d="M10 5.5h4v2" />
    <path d="M10 18.5h4v-2" />
    <path d="M14 12h-4v-5.5" />
    <path d="M10 12v5.5" />
  </svg>
);

const myMatchesIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 11h-6" />
    <path d="M19 8v6" />
  </svg>
);

const adminIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

export default function BottomTabBar() {
  const pathname = usePathname();

  // Extract slug from /court/[slug] paths
  const courtSlugMatch = pathname.match(/^\/court\/([^/]+)/);
  const courtSlug = courtSlugMatch ? courtSlugMatch[1] : null;

  // Extract tournament ID from /tournament/[id] paths
  const tournamentIdMatch = pathname.match(/^\/tournament\/(\d+)/);
  const tournamentId = tournamentIdMatch ? tournamentIdMatch[1] : null;

  // Court picker page — no tab bar
  if (pathname === '/court') return null;

  // Tournament list page — no tab bar
  if (pathname === '/tournament' || pathname === '/tournament/new') return null;

  // Tournament mode: /tournament/[id]/*
  if (tournamentId) {
    const tournamentTabs = [
      { href: `/tournament/${tournamentId}`, label: 'Bracket', icon: bracketIcon },
      { href: `/tournament/${tournamentId}/my-matches`, label: 'My Matches', icon: myMatchesIcon },
      { href: `/tournament/${tournamentId}/admin`, label: 'Admin', icon: adminIcon },
    ];

    return (
      <nav className="tab-bar">
        <Link href="/tournament" className="">
          {backIcon}
          Back
        </Link>
        {tournamentTabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link key={tab.href} href={tab.href} className={isActive ? 'active' : ''}>
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Kiosk mode: /court/[slug] or /court/[slug]/matches
  if (courtSlug) {
    const kioskTabs = [
      { href: `/court/${courtSlug}`, label: 'Check In', icon: checkInIcon },
      { href: `/court/${courtSlug}/matches`, label: 'Matches', icon: matchesIcon },
    ];

    return (
      <nav className="tab-bar">
        {kioskTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link key={tab.href} href={tab.href} className={isActive ? 'active' : ''}>
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Mobile mode
  const mobileTabs = [
    { href: '/', label: 'Courts', icon: courtsIcon },
    { href: '/tournament', label: 'Tournaments', icon: tournamentIcon },
    { href: '/leaderboard', label: 'Leaderboard', icon: leaderboardIcon },
  ];

  return (
    <nav className="tab-bar">
      {mobileTabs.map((tab) => {
        const isActive =
          tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);

        return (
          <Link key={tab.href} href={tab.href} className={isActive ? 'active' : ''}>
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
