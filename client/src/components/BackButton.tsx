import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  href?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  href = '/dashboard',
  className = ''
}) => {
  return (
    <Button variant="outline" size="icon" asChild className={className}>
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );
};

export default BackButton;