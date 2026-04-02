import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

function formatSegment(segment: string) {
    if (segment === 'global-search') {
        return 'Global Search';
    }

    return segment;
}

export function Breadcrumbs() {
    const location = useLocation();

    const pathSegments = location.pathname.split('/').filter(p => p && p !== 'viewer');

    return (
        <div className="flex items-center text-sm font-sans-tech font-bold text-muted-foreground uppercase tracking-wider">
            {pathSegments.map((segment, index) => {
                const to = `/viewer/${pathSegments.slice(0, index + 1).join('/')}`;
                const isLast = index === pathSegments.length - 1;
                const displaySegment = formatSegment(segment);

                return (
                    <div key={to} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                        {isLast ? (
                            <span className="font-bold text-primary truncate max-w-[150px]">
                                {displaySegment}
                            </span>
                        ) : (
                            <Link
                                to={to}
                                className="hover:text-foreground transition-colors truncate max-w-[150px] hover:underline decoration-dotted underline-offset-4 font-bold"
                            >
                                {displaySegment}
                            </Link>
                        )}
                    </div>
                );
            })}
        </div>
    );
}