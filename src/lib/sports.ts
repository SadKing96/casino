import { getGlobalConfig } from '@/lib/admin'

export interface SportsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number;
      }>
    }>
  }>
}

export async function fetchLiveOdds(sportKey: string = 'upcoming'): Promise<SportsEvent[]> {
  const config = await getGlobalConfig()
  const apiKey = config.sportsApiKey

  if (!apiKey || apiKey.trim() === '') {
    return getMockedOdds(sportKey)
  }

  try {
    const res = await fetch(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`, { next: { revalidate: 300 } })
    if (!res.ok) {
        console.error("Odds API Error:", await res.text())
        return getMockedOdds(sportKey)
    }
    const data = await res.json()
    return data
  } catch (error) {
    console.error(error)
    return getMockedOdds(sportKey)
  }
}

function getMockedOdds(sportKey: string): SportsEvent[] {
  const isNBA = sportKey === 'basketball_nba';
  const isSoccer = sportKey === 'soccer_epl';
  
  let teams = [
    { home: 'Kansas City Chiefs', away: 'Las Vegas Raiders' },
    { home: 'Philadelphia Eagles', away: 'Dallas Cowboys' },
    { home: 'San Francisco 49ers', away: 'Seattle Seahawks' },
  ];

  let title = 'NFL';
  let defaultKey = 'americanfootball_nfl';

  if (isNBA) {
    teams = [
      { home: 'Los Angeles Lakers', away: 'Golden State Warriors' },
      { home: 'Boston Celtics', away: 'Miami Heat' },
      { home: 'Denver Nuggets', away: 'Phoenix Suns' },
    ];
    title = 'NBA';
    defaultKey = 'basketball_nba';
  } else if (isSoccer) {
    teams = [
        { home: 'Arsenal', away: 'Chelsea' },
        { home: 'Manchester City', away: 'Liverpool' },
        { home: 'Real Madrid', away: 'Barcelona' }
    ]
    title = 'Soccer';
    defaultKey = 'soccer_epl';
  }

  return teams.map((t, i) => {
    // Generate some slightly randomized plausible American odds
    const ml1 = Math.random() > 0.5 ? -Math.floor(110 + Math.random() * 200) : Math.floor(110 + Math.random() * 200)
    const ml2 = ml1 < 0 ? Math.floor(Math.abs(ml1) - 20) : -Math.floor(ml1 + 20)
    
    const spreadVal = (Math.floor(Math.random() * 15) + 1) + 0.5
    const totalVal = Math.floor(200 + Math.random() * 40) + 0.5
    
    return {
      id: `mock_event_${defaultKey}_${i}`,
      sport_key: defaultKey,
      sport_title: title,
      commence_time: new Date(Date.now() + (i + 1) * 3600000).toISOString(), // 1 hour intervals
      home_team: t.home,
      away_team: t.away,
      bookmakers: [
        {
          title: 'MockBook',
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: t.home, price: ml1 },
                { name: t.away, price: ml2 }
              ]
            },
            {
              key: 'spreads',
              outcomes: [
                { name: t.home, price: -110, point: ml1 < 0 ? -spreadVal : spreadVal },
                { name: t.away, price: -110, point: ml1 < 0 ? spreadVal : -spreadVal }
              ]
            },
            {
              key: 'totals',
              outcomes: [
                { name: 'Over', price: -110, point: totalVal },
                { name: 'Under', price: -110, point: totalVal }
              ]
            }
          ]
        }
      ]
    }
  })
}
