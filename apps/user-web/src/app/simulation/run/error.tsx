'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Simulation Run Error:', error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">시뮬레이션 실행 중 오류가 발생했습니다.</h2>
      <div className="bg-gray-800 p-4 rounded-lg mb-6 max-w-lg overflow-auto">
        <p className="text-red-400 font-mono text-sm">{error.message}</p>
        {error.digest && <p className="text-gray-500 text-xs mt-2">Digest: {error.digest}</p>}
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
