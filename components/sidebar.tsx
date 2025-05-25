// components/Sidebar.tsx

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/dashboard/manajemen">Manajemen</a></li>
        {/* tambahin menu lain */}
      </ul>
    </aside>
  )
}
