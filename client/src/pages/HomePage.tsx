import MainLayout from '../layouts/MainLayout'

export default function HomePage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
        <h1 className="text-3xl font-semibold">AyiyaCMS</h1>
        <p className="mt-4 text-slate-600">
          Phase 1 foundation is ready: frontend structure, backend entities, and shared API scaffolding.
        </p>
      </div>
    </MainLayout>
  )
}
