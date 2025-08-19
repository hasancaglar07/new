'use client';

import { AlertTriangle, RefreshCw, X, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function ErrorMessage({ 
  title = 'Bir Hata Oluştu',
  message = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
  type = 'error',
  onRetry = null,
  onDismiss = null,
  className = '',
  showIcon = true
}) {
  const typeConfig = {
    error: {
      icon: AlertTriangle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700'
    },
    network: {
      icon: WifiOff,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-600',
      titleColor: 'text-orange-800',
      messageColor: 'text-orange-700'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700'
    }
  };

  const config = typeConfig[type] || typeConfig.error;
  const Icon = config.icon;

  return (
    <Card className={cn(
      'border-l-4',
      config.bgColor,
      config.borderColor,
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {showIcon && (
            <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className={cn('font-medium text-sm', config.titleColor)}>
              {title}
            </h3>
            <p className={cn('mt-1 text-sm', config.messageColor)}>
              {message}
            </p>
            
            {(onRetry || onDismiss) && (
              <div className="mt-3 flex gap-2">
                {onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="h-8 px-3 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Tekrar Dene
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDismiss}
                    className="h-8 px-3 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Kapat
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized error components
export function NetworkError({ onRetry, onDismiss }) {
  return (
    <ErrorMessage
      type="network"
      title="Bağlantı Hatası"
      message="İnternet bağlantınızı kontrol edin ve tekrar deneyin."
      onRetry={onRetry}
      onDismiss={onDismiss}
    />
  );
}

export function NotFoundError({ message = 'Aradığınız içerik bulunamadı.' }) {
  return (
    <ErrorMessage
      title="İçerik Bulunamadı"
      message={message}
      type="warning"
    />
  );
}

export function ServerError({ onRetry }) {
  return (
    <ErrorMessage
      title="Sunucu Hatası"
      message="Sunucuda bir sorun oluştu. Lütfen daha sonra tekrar deneyin."
      onRetry={onRetry}
    />
  );
}