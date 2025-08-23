'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Fuel, 
  Clock, 
  Zap, 
  TrendingUp, 
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatGasPrice, formatEthAmount, type GasEstimates, type GasSpeed } from '@/lib/gas'

interface GasFeeDisplayProps {
  gasEstimates?: GasEstimates
  selectedSpeed: GasSpeed
  onSpeedChange?: (speed: GasSpeed) => void
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  transactionType: 'approval' | 'deposit' | 'claim'
  className?: string
  compact?: boolean
}

const speedConfig = {
  slow: {
    label: 'Slow',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Lower fees, longer wait',
  },
  standard: {
    label: 'Standard',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    description: 'Balanced fees and speed',
  },
  fast: {
    label: 'Fast',
    icon: Zap,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'Higher fees, faster confirmation',
  },
  instant: {
    label: 'Instant',
    icon: Fuel,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    description: 'Highest fees, fastest confirmation',
  },
} as const

export function GasFeeDisplay({
  gasEstimates,
  selectedSpeed,
  onSpeedChange,
  isLoading = false,
  error,
  onRefresh,
  transactionType,
  className,
  compact = false,
}: GasFeeDisplayProps) {
  const [isExpanded, setIsExpanded] = React.useState(!compact)
  
  const currentEstimate = gasEstimates?.[selectedSpeed]
  const config = speedConfig[selectedSpeed]
  const Icon = config.icon

  if (compact && !isExpanded) {
    return (
      <div className={cn("flex items-center justify-between p-3 bg-muted/30 rounded-lg", className)}>
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Gas Fee</span>
          {currentEstimate && (
            <Badge variant="outline" className={cn("text-xs", config.color)}>
              {currentEstimate.totalCostFormatted}
            </Badge>
          )}
          {isLoading && (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="h-8 w-8 p-0"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Gas Fee
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLoading && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            {error}
          </div>
        )}

        {gasEstimates && (
          <>
            {/* Speed Selection */}
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(speedConfig) as [GasSpeed, typeof speedConfig[GasSpeed]][]).map(([speed, speedConf]) => {
                const estimate = gasEstimates[speed]
                const SpeedIcon = speedConf.icon
                const isSelected = selectedSpeed === speed
                
                return (
                  <Button
                    key={speed}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      console.log('Gas speed button clicked:', speed)
                      onSpeedChange?.(speed)
                    }}
                    disabled={!onSpeedChange}
                    className={cn(
                      "h-auto p-3 flex flex-col items-start gap-1 relative cursor-pointer",
                      "hover:scale-[1.02] transition-transform duration-200",
                      !isSelected && "hover:border-2",
                      !isSelected && `hover:${speedConf.borderColor}`,
                      !onSpeedChange && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <SpeedIcon className={cn(
                        "h-4 w-4", 
                        isSelected ? "text-primary-foreground" : speedConf.color
                      )} />
                      <span className={cn(
                        "font-medium",
                        isSelected ? "text-primary-foreground" : "text-foreground"
                      )}>
                        {speedConf.label}
                      </span>
                    </div>
                    <div className={cn(
                      "text-xs text-left",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {estimate ? estimate.totalCostFormatted : 'Estimating...'}
                    </div>
                  </Button>
                )
              })}
            </div>

            {/* Current Selection Details */}
            {currentEstimate && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className="text-sm font-medium">{config.label} Gas</span>
                    <Badge variant="outline" className="text-xs">
                      {config.description}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Gas Limit</div>
                      <div className="font-mono">{currentEstimate.gasLimit.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Gas Price</div>
                      <div className="font-mono">
                        {currentEstimate.isEIP1559 && currentEstimate.maxFeePerGas
                          ? formatGasPrice(currentEstimate.maxFeePerGas)
                          : formatGasPrice(currentEstimate.gasPrice)
                        }
                      </div>
                    </div>
                  </div>

                  {currentEstimate.isEIP1559 && currentEstimate.maxPriorityFeePerGas && (
                    <div className="text-sm">
                      <div className="text-muted-foreground">Priority Fee</div>
                      <div className="font-mono">{formatGasPrice(currentEstimate.maxPriorityFeePerGas)}</div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Cost</span>
                    <span className={cn("font-mono font-bold", config.color)}>
                      {currentEstimate.totalCostFormatted}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {!gasEstimates && !isLoading && !error && (
          <div className="text-center py-4 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Gas estimates will appear here</p>
            <p className="text-xs mt-1">
              Enter an amount to see gas fees
            </p>
          </div>
        )}

        {isLoading && !gasEstimates && (
          <div className="text-center py-4 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Estimating gas fees...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for inline display
export function GasFeeInline({
  gasEstimates,
  selectedSpeed,
  transactionType,
  className,
}: {
  gasEstimates?: GasEstimates
  selectedSpeed: GasSpeed
  transactionType: 'approval' | 'deposit' | 'claim'
  className?: string
}) {
  const currentEstimate = gasEstimates?.[selectedSpeed]
  const config = speedConfig[selectedSpeed]
  const Icon = config.icon

  if (!currentEstimate) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Icon className={cn("h-3 w-3", config.color)} />
      <span className="text-muted-foreground">Gas:</span>
      <span className="font-mono">{currentEstimate.totalCostFormatted}</span>
      <Badge variant="outline" className="text-xs">
        {config.label}
      </Badge>
    </div>
  )
}