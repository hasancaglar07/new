"use client";

import { useState } from 'react';
import MobileLayout from './MobileLayout';
import BottomNav from './BottomNav';

export default function NativeAppProvider({ children }) {
  const [isNativeApp, setIsNativeApp] = useState(false);

  return (
    <MobileLayout isNativeApp={isNativeApp} setIsNativeApp={setIsNativeApp}>
      {children}
      {!isNativeApp && <BottomNav />}
    </MobileLayout>
  );
}