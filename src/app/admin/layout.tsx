import { requireAdmin } from '@/lib/admin'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // This will throw and block access if the user is not an Admin
  let user;
  try {
    user = await requireAdmin();
  } catch (e) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#ff3366' }}>
        <h1>403 Forbidden</h1>
        <p>You do not have permission to access the Command Center.</p>
        <Link href="/" className="btn-secondary">Return to Casino</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <div style={{ padding: '20px 40px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '2rem' }}>🛡️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#ffcc00', letterSpacing: '2px', textTransform: 'uppercase' }}>Admin Command Center</h1>
            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Authenticated as {user.username}</div>
          </div>
        </div>
        <Link href="/" className="btn-secondary">Exit to Casino</Link>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
