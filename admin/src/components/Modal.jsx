import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Modal({ title, children, onClose }) {
    // Close on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 rounded-full transition text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
