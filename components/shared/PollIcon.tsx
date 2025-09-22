'use client';

import { FaLock, FaGlobe } from 'react-icons/fa';

interface PollIconProps {
  isPrivate: boolean;
  className?: string;
}

export default function PollIcon({ isPrivate, className }: PollIconProps) {
  if (isPrivate) {
    return <FaLock className={className} title="Private Poll" />;
  } else {
    return <FaGlobe className={className} title="Public Poll" />;
  }
}
