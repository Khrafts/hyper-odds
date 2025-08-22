'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { imageOptimizations } from '@/lib/performance'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  fill?: boolean
  aspectRatio?: keyof typeof imageOptimizations.aspectRatios
  loading?: 'lazy' | 'eager'
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  aspectRatio,
  loading = 'lazy',
  ...props
}: OptimizedImageProps) {
  // Generate responsive sizes if not provided
  const responsiveSizes = sizes || (
    fill 
      ? "(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
      : `(max-width: 640px) ${width || 640}px, ${width || 1024}px`
  )

  // Generate placeholder blur data URL if needed
  const placeholderDataURL = blurDataURL || (
    placeholder === 'blur' && !blurDataURL
      ? 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx4f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=='
      : undefined
  )

  const imageClassName = cn(
    'object-cover',
    aspectRatio && `aspect-${imageOptimizations.aspectRatios[aspectRatio]}`,
    className
  )

  if (fill) {
    return (
      <div className="relative overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          quality={quality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={placeholderDataURL}
          sizes={responsiveSizes}
          className={imageClassName}
          loading={priority ? 'eager' : loading}
          {...props}
        />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={quality}
      priority={priority}
      placeholder={placeholder}
      blurDataURL={placeholderDataURL}
      sizes={responsiveSizes}
      className={imageClassName}
      loading={priority ? 'eager' : loading}
      {...props}
    />
  )
}

// Avatar component with optimized image loading
interface OptimizedAvatarProps {
  src?: string
  alt: string
  size?: number
  fallback?: React.ReactNode
  className?: string
  priority?: boolean
}

export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  fallback,
  className,
  priority = false
}: OptimizedAvatarProps) {
  const avatarClassName = cn(
    'rounded-full object-cover',
    className
  )

  if (!src) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted rounded-full',
          avatarClassName
        )}
        style={{ width: size, height: size }}
      >
        {fallback || (
          <span className="text-sm font-medium">
            {alt.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={avatarClassName}
      priority={priority}
      quality={90}
      placeholder="blur"
    />
  )
}

// Icon component with optimized SVG loading
interface OptimizedIconProps {
  src: string
  alt: string
  size?: number
  className?: string
}

export function OptimizedIcon({
  src,
  alt,
  size = 24,
  className
}: OptimizedIconProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('inline-block', className)}
      priority={true}
      quality={100}
    />
  )
}