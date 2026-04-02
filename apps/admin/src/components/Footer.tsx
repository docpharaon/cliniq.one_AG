export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-border py-4 px-6 mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-text-muted text-xs">
                <span>© {year} cliniq.one. All rights reserved.</span>
                <div className="flex items-center gap-4">
                    <span
                        className="hover:text-accent transition-colors cursor-default"
                        title="Coming soon"
                    >
                        Terms of Service
                    </span>
                    <span
                        className="hover:text-accent transition-colors cursor-default"
                        title="Coming soon"
                    >
                        Privacy Policy
                    </span>
                </div>
            </div>
        </footer>
    );
}
