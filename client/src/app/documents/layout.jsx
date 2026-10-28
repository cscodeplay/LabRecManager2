import OfficeFloatingTopNav from '@/components/OfficeFloatingTopNav';

export default function DocumentsLayout({ children }) {
    return (
        <div className="relative min-h-screen">
            {/* Horizontal Floating Suite Dock & Welcome Launchpad */}
            <OfficeFloatingTopNav />
            {children}
        </div>
    );
}
