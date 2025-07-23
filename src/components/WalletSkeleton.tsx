import React from 'react';

export const WalletBarSkeleton = () => (
  <div className="flex items-center gap-2">
    <div className="w-20 h-8 bg-gray-200 animate-pulse rounded" />
  </div>
);

export const NetworkSwitcherSkeleton = () => (
  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
);

export const NotificationCenterSkeleton = () => (
  <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full" />
);
