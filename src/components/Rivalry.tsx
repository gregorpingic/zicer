import { useEffect, useState } from 'react';
import type { MatchRecord } from '../core/types';
import { allMatchRecords } from '../db/db';

// Rivalstvo kroz vrijeme: ukupni omjer pobjeda, niz pobjeda i prvak mjeseca (samo dvoboji ovo dvoje, bez računala).

const MONTHS = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];

export interface RivalryStats {
  wins: [number, number];
  streak: { player: 0 | 1; count: number } | null;
  month: [number, number];
  lastMonth: { player: 0 | 1 | null; name: string } | null;
}

export function rivalryStats(records: MatchRecord[], players: [string, string], now = new Date()): RivalryStats {
  const idx = (name: string) => players.indexOf(name) as 0 | 1 | -1;
  const games = records
    .filter((r) => r.players.every((n) => players.includes(n)) && r.players[0] !== r.players[1])
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .map((r) => ({ at: new Date(r.finishedAt), winner: idx(r.players[r.winner]) }))
    .filter((g) => g.winner !== -1) as { at: Date; winner: 0 | 1 }[];
  const wins: [number, number] = [0, 0];
  const month: [number, number] = [0, 0];
  const last: [number, number] = [0, 0];
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  for (const g of games) {
    wins[g.winner]++;
    if (g.at.getFullYear() === now.getFullYear() && g.at.getMonth() === now.getMonth()) month[g.winner]++;
    if (g.at.getFullYear() === lm.getFullYear() && g.at.getMonth() === lm.getMonth()) last[g.winner]++;
  }
  let streak: RivalryStats['streak'] = null;
  if (games.length) {
    const p = games[games.length - 1].winner;
    let n = 0;
    for (let i = games.length - 1; i >= 0 && games[i].winner === p; i--) n++;
    streak = { player: p, count: n };
  }
  const lastMonth = last[0] + last[1] ? { player: last[0] === last[1] ? null : last[0] > last[1] ? (0 as const) : (1 as const), name: MONTHS[lm.getMonth()] } : null;
  return { wins, streak, month, lastMonth };
}

export default function Rivalry({ players, className = '' }: { players: [string, string]; className?: string }) {
  const [stats, setStats] = useState<RivalryStats | null>(null);
  useEffect(() => {
    const load = () => void allMatchRecords().then((r) => setStats(rivalryStats(r, players)));
    load();
    window.addEventListener('zicer-data', load);
    return () => window.removeEventListener('zicer-data', load);
  }, [players]);
  if (!stats || stats.wins[0] + stats.wins[1] === 0) return null;
  const { wins, streak, month, lastMonth } = stats;
  return (
    <div className={`rivalry ${className}`}>
      <div className="rivalry-score">
        <span className="p0-text">{players[0]}</span>
        <strong>
          {wins[0]} : {wins[1]}
        </strong>
        <span className="p1-text">{players[1]}</span>
      </div>
      <div className="rivalry-notes">
        {streak && streak.count >= 2 && (
          <span>
            🔥 {players[streak.player]} pobjeđuje {streak.count}× zaredom
          </span>
        )}
        {month[0] + month[1] > 0 && (
          <span>
            Ovaj mjesec {month[0]} : {month[1]}
          </span>
        )}
        {lastMonth && (
          <span>
            👑 {lastMonth.player === null ? `Prošli mjesec neriješeno` : `Prvak ${lastMonth.name}: ${players[lastMonth.player]}`}
          </span>
        )}
      </div>
    </div>
  );
}
