import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    className?: string;
    width?: number | string;
    height?: number | string;
    priority?: boolean; // If true, eager load (for hero images)
}

export function OptimizedImage({
    src,
    alt,
    className,
    width,
    height,
    priority = false,
    ...props
}: OptimizedImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (priority) {
            const img = new Image();
            img.src = src;
            img.onload = () => setIsLoaded(true);
            img.onerror = () => setError(true);
        }
    }, [src, priority]);

    return (
        <div
            className={cn(
                "overflow-hidden bg-muted/20 relative",
                className
            )}
            style={{ width: width ? width : "auto", height: height ? height : "auto" }}
        >
            <img
                src={src}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                decoding={priority ? "sync" : "async"}
                onLoad={() => setIsLoaded(true)}
                onError={() => setError(true)}
                className={cn(
                    "duration-700 ease-in-out w-full h-full object-cover",
                    isLoaded ? "scale-100 blur-0 grayscale-0" : "scale-110 blur-xl grayscale",
                    error && "opacity-50",
                    className
                )}
                width={width}
                height={height}
                {...props}
            />
            {!isLoaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse" />
            )}
        </div>
    );
}
