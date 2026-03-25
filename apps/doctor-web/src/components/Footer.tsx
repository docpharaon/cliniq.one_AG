export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-border py-4 px-6 mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-text-muted text-xs">
                <span>© {year} cliniq.one. All rights reserved.</span>
                <div className="flex items-center gap-4">
                    <a
                        href="https://cliniq.one/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent transition-colors"
                    >
                        Terms of Service
                    </a>
                    <a
                        href="https://cliniq.one/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent transition-colors"
                    >
                        Privacy Policy
                    </a>
                </div>
            </div>
        </footer>
    );
}
