import { fetchLiveOdds } from '@/lib/sports'
import SportsbookClient from './SportsbookClient'
import { getGlobalConfig } from '@/lib/admin'

export default async function SportsbookPage({ searchParams }: { searchParams: { sport?: string } }) {
  // Await the searchParams to safely extract values
  const resolvedParams = await searchParams
  const sport = resolvedParams?.sport || 'americanfootball_nfl'
  
  const config = await getGlobalConfig()
  const enabledGames = JSON.parse(config.enabledGames)
  
  if (!enabledGames.includes('sportsbook')) {
    return <div style={{ padding: '50px', textAlign: 'center', color: '#fff' }}><h2>Sportsbook is currently offline.</h2></div>
  }

  const events = await fetchLiveOdds(sport)

  return (
    <div style={{ width: '100%', margin: '0 auto', padding: '0 20px' }}>
      <SportsbookClient initialEvents={events} initialSport={sport} />
    </div>
  )
}
