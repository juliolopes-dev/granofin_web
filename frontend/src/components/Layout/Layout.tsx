import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <main className="ml-20 min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  )
}
