'use client';
/* eslint-disable @next/next/no-img-element -- catalogue cards show the build-generated preview file directly */
import { useState, type ImgHTMLAttributes } from 'react';
import type { Asset } from '@knolstory/asset-registry';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { asset: Pick<Asset, 'src' | 'previewSrc'> };

/** Picker, shelf and page-list cards: the small preview, or the original when no preview was built. */
export function AssetPreviewImage({ asset, onError, alt = '', loading = 'lazy', decoding = 'async', ...rest }: Props) {
  const [fallback, setFallback] = useState<string>();
  const src = fallback === asset.src ? asset.src : asset.previewSrc;
  return <img {...rest} src={src} alt={alt} loading={loading} decoding={decoding} data-asset-preview={src === asset.previewSrc ? '' : undefined}
    onError={event => { if (src !== asset.src) setFallback(asset.src); else onError?.(event); }} />;
}
