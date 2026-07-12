import type { ButtonHTMLAttributes } from 'react';
export default function ActionButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`app-button app-button-primary ${className}`} {...props} />; }
