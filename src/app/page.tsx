import LobbyClient from './LobbyClient'
import { getLeaderboard } from './actions'
import { getGlobalConfig } from '@/lib/admin'

export const dynamic = 'force-dynamic';

export default async function Home() {
  const leaderboard = await getLeaderboard()
  const config = await getGlobalConfig()
  const enabledGames = JSON.parse(config.enabledGames)
  
  return <LobbyClient initialLeaderboard={leaderboard} enabledGames={enabledGames} />
}
