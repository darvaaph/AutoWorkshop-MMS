import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-900">404</h1>
        <p className="text-xl text-slate-600 mt-4">Halaman tidak ditemukan</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
