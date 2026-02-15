import { useEffect } from 'react';

interface Shortcuts {
    [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcuts): void {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            const parts: string[] = [];
            if (event.metaKey || event.ctrlKey) parts.push('cmd');
            if (event.altKey) parts.push('alt');
            if (event.shiftKey) parts.push('shift');
            parts.push(event.key.toLowerCase());

            const combo = parts.join('+');
            const handler = shortcuts[combo];

            if (handler) {
                event.preventDefault();
                handler();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
