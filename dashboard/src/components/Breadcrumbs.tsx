import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    to: string;
    sourceIndex: number;
}

function formatSegment(segment: string) {
    if (segment === 'global-search') {
        return 'Global Search';
    }
    if (segment.toLowerCase() === 'cornercases') {
        return 'cornerCases';
    }

    return segment;
}

function buildBreadcrumbItems(pathSegments: string[], viewerBasePath: string): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];

    for (let index = 0; index < pathSegments.length; index += 1) {
        const segment = pathSegments[index];
        const nextSegment = pathSegments[index + 1]?.toLowerCase();
        const thirdSegment = pathSegments[index + 2]?.toLowerCase();
        const isGeneratedFramesPath =
            segment.toLowerCase() === 'misc' &&
            nextSegment === 'egos' &&
            (thirdSegment === 'egos' || thirdSegment === 'cornercases' || thirdSegment === 'corner_images_controlnet');

        if (isGeneratedFramesPath) {
            const targetIndex = index + 2;
            const label = thirdSegment === 'egos' ? 'egos' : 'cornerCases';
            items.push({
                label: segment,
                to: `${viewerBasePath}/${pathSegments.slice(0, index + 1).join('/')}`,
                sourceIndex: index,
            });
            items.push({
                label,
                to: `${viewerBasePath}/${pathSegments.slice(0, targetIndex + 1).join('/')}`,
                sourceIndex: targetIndex,
            });
            index = targetIndex;
            continue;
        }

        items.push({
            label: segment,
            to: `${viewerBasePath}/${pathSegments.slice(0, index + 1).join('/')}`,
            sourceIndex: index,
        });
    }

    return items;
}

export function Breadcrumbs() {
    const location = useLocation();
    const viewerBasePath = location.pathname.startsWith('/robodatahub') ? '/robodatahub' : '/viewer';

    const pathSegments = location.pathname
        .split('/')
        .filter(p => p && p !== 'viewer' && p !== 'robodatahub');
    const breadcrumbItems = buildBreadcrumbItems(pathSegments, viewerBasePath);

    return (
        <div className="flex items-center text-sm font-sans-tech font-bold text-muted-foreground uppercase tracking-wider">
            {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                const displaySegment = formatSegment(item.label);

                return (
                    <div key={`${item.to}-${item.sourceIndex}`} className="flex items-center">
                        <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/50" />
                        {isLast ? (
                            <span className="font-bold text-primary truncate max-w-[150px]">
                                {displaySegment}
                            </span>
                        ) : (
                            <Link
                                to={item.to}
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
