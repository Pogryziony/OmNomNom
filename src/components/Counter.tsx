import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="space-y-4">
      <p className="text-lg text-gray-700">
        This is a React 19 component with interactive state
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setCount(count - 1)}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
        >
          Decrement
        </button>
        <span className="text-4xl font-bold text-indigo-600">{count}</span>
        <button
          onClick={() => setCount(count + 1)}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
        >
          Increment
        </button>
      </div>
      <button
        onClick={() => setCount(0)}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
