/**
 * Full Screen Loading Component
 *
 * Shows during authentication transitions
 */

'use client';

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Spinner */}
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        </div>

        {/* Message */}
        <p className="mt-6 text-gray-700 dark:text-gray-300 text-lg font-medium">
          {message}
        </p>

        {/* Dots animation */}
        <div className="flex justify-center items-center space-x-2 mt-4">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
