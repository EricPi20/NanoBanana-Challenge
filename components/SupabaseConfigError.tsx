'use client';

export default function SupabaseConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border-4 border-red-500">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            Supabase Configuration Required
          </h1>
          <p className="text-gray-600">
            Ahoy! Ye need to set up Supabase before ye can play, matey!
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📋 Quick Setup Steps:
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase</a></li>
            <li>Create a new project (or use existing)</li>
            <li>Go to Settings → API to get your URL and anon key</li>
            <li>Run the SQL schema in Database → SQL Editor (see schema.sql file)</li>
            <li>Create a storage bucket named &quot;submissions&quot; in Storage</li>
            <li>Enable Realtime in Database → Replication</li>
            <li>Create a <code className="bg-gray-200 px-2 py-1 rounded">.env.local</code> file in the project root</li>
            <li>Add your Supabase config (see template below)</li>
            <li>Restart the dev server</li>
          </ol>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h3 className="text-white font-bold mb-2">📝 .env.local Template:</h3>
          <pre className="text-green-400 text-sm overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here`}
          </pre>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-800">
            <strong>💡 Tip:</strong> After creating <code className="bg-blue-100 px-2 py-1 rounded">.env.local</code>, 
            stop the dev server (Ctrl+C) and restart it with <code className="bg-blue-100 px-2 py-1 rounded">npm run dev</code>
          </p>
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
          >
            🚀 Go to Supabase
          </a>
        </div>
      </div>
    </div>
  );
}


