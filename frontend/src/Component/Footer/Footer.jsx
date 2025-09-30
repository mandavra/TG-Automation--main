export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-2 text-blue-400">Rutansh</h2>
          <p className="text-sm text-gray-300">
            © {new Date().getFullYear()} Rutansh Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
