import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs() {
    const location = useLocation();

    // Remove /viewer from the start and split
    // e.g. /viewer/automotive/bmw -> ['', 'viewer', 'automotive', 'bmw']
    // We want ['automotive', 'bmw']
    const pathSegments = location.pathname.split('/').filter(p => p && p !== 'viewer');

    return (
        <div className="flex items-center text-sm text-slate-400">


            {pathSegments.map((segment, index) => {
                // Reconstruct path for this segment
                // /viewer + /segment1 + /segment2 ...
                const to = `/viewer/${pathSegments.slice(0, index + 1).join('/')}`;
                const isLast = index === pathSegments.length - 1;

                return (
                    <div key={to} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1 text-slate-600" />
                        {isLast ? (
                            <span className="font-bold text-slate-200 truncate max-w-[150px]">
                                {segment}
                            </span>
                        ) : (
                            <Link
                                to={to}
                                className="hover:text-slate-200 transition-colors truncate max-w-[150px]"
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
