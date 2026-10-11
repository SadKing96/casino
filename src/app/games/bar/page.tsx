import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Table from './Table'

export default async function BarPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (!userId) {
    redirect('/login')
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 className="text-gradient-gold" style={{ marginBottom: '20px', fontSize: '2.5rem' }}>The Casino Lounge & Bar</h1>
      <Table />
    </div>
  )
}
