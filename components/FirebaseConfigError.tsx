'use client';

export default function FirebaseConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border-4 border-red-500">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            Firebase Configuration Required
          </h1>
          <p className="text-gray-600">
            Ahoy! Ye need to set up Firebase before ye can play, matey!
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📋 Quick Setup Steps:
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firebase Console</a></li>
            <li>Create a new project (or use existing)</li>
            <li>Enable <strong>Realtime Database</strong> (start in test mode)</li>
            <li>Enable <strong>Storage</strong> (start in test mode)</li>
            <li>Go to Project Settings → Your apps → Web app</li>
            <li>Copy your Firebase config values</li>
            <li>Create a <code className="bg-gray-200 px-2 py-1 rounded">.env.local</code> file in the project root</li>
            <li>Add your Firebase config (see template below)</li>
            <li>Restart the dev server</li>
          </ol>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h3 className="text-white font-bold mb-2">📝 .env.local Template:</h3>
          <pre className="text-green-400 text-sm overflow-x-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id`}
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
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
          >
            🚀 Go to Firebase Console
          </a>
        </div>
      </div>
    </div>
  );
}

