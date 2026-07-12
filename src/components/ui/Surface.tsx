import type { HTMLAttributes } from 'react';
export default function Surface({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`app-surface ${className}`} {...props} />; }
