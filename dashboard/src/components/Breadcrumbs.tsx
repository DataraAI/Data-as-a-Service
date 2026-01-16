import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs() {
    const location = useLocation();

    // Remove /viewer from the start and split
    // e.g. /viewer/automotive/bmw -> ['', 'viewer', 'automotive', 'bmw']
    // We want ['automotive', 'bmw']
    const pathSegments = location.pathname.split('/').filter(p => p && p !== 'viewer');

    return (
        <div className="flex items-center text-sm font-sans-tech font-bold text-muted-foreground uppercase tracking-wider">


            {pathSegments.map((segment, index) => {
                // Reconstruct path for this segment
                // /viewer + /segment1 + /segment2 ...
                const to = `/viewer/${pathSegments.slice(0, index + 1).join('/')}`;
                const isLast = index === pathSegments.length - 1;

                return (
                    <div key={to} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                        {isLast ? (
                            <span className="font-bold text-primary truncate max-w-[150px]">
                                {segment}
                            </span>
                        ) : (
                            <Link
                                to={to}
                                className="hover:text-foreground transition-colors truncate max-w-[150px] hover:underline decoration-dotted underline-offset-4 font-bold"
                            >
                                {segment}
                            </Link>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
