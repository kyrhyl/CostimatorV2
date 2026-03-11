import { ReactNode } from 'react';
import styles from './A4PageWrapper.module.css';

interface A4PageWrapperProps {
  pageNumber: number | string;
  children: ReactNode;
  orientation?: 'landscape' | 'portrait';
}

export function A4PageWrapper({ pageNumber, children, orientation = 'landscape' }: A4PageWrapperProps) {
  return (
    <div 
      className={`a4-page ${styles['a4-page']} ${
        orientation === 'portrait' ? 'a4-page-portrait' : 'a4-page-landscape'
      }`}
      data-page={pageNumber}
      data-orientation={orientation}
    >
      {children}
    </div>
  );
}
