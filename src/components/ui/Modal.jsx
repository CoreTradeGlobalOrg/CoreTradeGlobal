/**
 * Reusable Modal Component
 *
 * Features:
 * - Scroll Lock (disables body scroll when open)
 * - Backdrop click to close
 * - Z-Index 1000 (above Navbar)
 * - Glassmorphism styling
 * - Variant support (gold/blue)
 */

'use client';

import { useEffect } from 'react';

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    className = '',
    hideHeader = false,
    transparentBackdrop = false,
    variant = 'gold' // 'gold' or 'blue'
}) {
    // Handle Scroll Lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup function to restore scroll when component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Don't render if not open
    if (!isOpen) return null;

    const closeButtonColor = variant === 'blue' ? '#3b82f6' : '#FFD700';

    return (
        <div
            className={`fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-4 backdrop-blur-sm ${transparentBackdrop ? 'bg-black/60' : 'bg-black/80'}`}
            onClick={onClose}
        >
            <div
                className={`bg-[#0F1B2B] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[rgba(255,255,255,0.1)] shadow-2xl ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Conditional */}
                {!hideHeader && (
                    <div className="sticky top-0 bg-[#0F1B2B]/95 backdrop-blur-xl border-b border-white/10 px-4 py-4 md:px-8 md:py-6 flex items-center justify-between z-50">
                        <h2 className="text-lg md:text-2xl font-bold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="transition-colors p-2 rounded-full cursor-pointer"
                            style={{
                                color: closeButtonColor,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${closeButtonColor}1a`}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className={hideHeader ? "p-4 md:p-6" : "p-4 md:p-8"}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Modal;
