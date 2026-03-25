import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy — cliniq.one',
    description: 'How cliniq.one handles your medical data with our zero-storage philosophy.',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#0A0E1A] text-[#F1F5F9]">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <a href="/" className="inline-flex items-center gap-2 text-sm text-[#2DD4BF] hover:underline mb-10">
                    ← Back to cliniq.one
                </a>
                <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                <p className="text-[#64748B] text-sm mb-10">Last updated: March 25, 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-8 text-[#94A3B8] leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">1. Overview</h2>
                        <p>cliniq.one, operated by Momencraft, is committed to protecting your privacy and medical data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our AI-powered telemedicine platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">2. Zero-Storage Philosophy</h2>
                        <p>cliniq.one operates on a <strong className="text-[#F1F5F9]">zero-storage philosophy</strong>. Your medical data is:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Processed in real-time session memory only</li>
                            <li>Never committed to permanent databases</li>
                            <li>Stored temporarily for a maximum of <strong className="text-[#F1F5F9]">24 hours</strong> to allow medical team review</li>
                            <li>Automatically purged after the 24-hour window</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">3. Information We Collect</h2>
                        <h3 className="text-base font-semibold text-[#F1F5F9] mb-2 mt-4">3a. Account Information</h3>
                        <p>Email address, name, and role (patient or doctor) — collected during registration.</p>
                        <h3 className="text-base font-semibold text-[#F1F5F9] mb-2 mt-4">3b. Medical Information (Temporary)</h3>
                        <p>Symptoms, medical history, medications, and consultation data — collected during AI medical interviews. This data is session-based and automatically purged.</p>
                        <h3 className="text-base font-semibold text-[#F1F5F9] mb-2 mt-4">3c. Technical Information</h3>
                        <p>Device type, browser version, and basic usage analytics — collected for platform improvement. No personal health data is included.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">4. How We Use Your Data</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>To facilitate AI-powered medical intake interviews</li>
                            <li>To route you to the appropriate medical specialist</li>
                            <li>To generate structured clinical notes for your doctor</li>
                            <li>To enable your doctor to provide diagnosis and treatment</li>
                            <li>To improve platform features and AI accuracy (using anonymized, aggregated data only)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">5. Data Security</h2>
                        <p>We employ enterprise-grade security measures including:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>End-to-end encryption for all data in transit</li>
                            <li>Row Level Security (RLS) on all database tables</li>
                            <li>HIPAA-aligned data handling practices</li>
                            <li>19 independent safety verification layers</li>
                            <li>No third-party data sharing</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">6. Third-Party Services</h2>
                        <p>We use the following third-party services with strict data handling agreements:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li><strong className="text-[#F1F5F9]">Supabase</strong> — Authentication and temporary session storage</li>
                            <li><strong className="text-[#F1F5F9]">OpenAI</strong> — AI-powered medical interviews (no patient data is stored by OpenAI)</li>
                            <li><strong className="text-[#F1F5F9]">Vercel</strong> — Web application hosting</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">7. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Request deletion of your account and all associated data</li>
                            <li>Access information about what data we hold (limited due to zero-storage)</li>
                            <li>Opt out of non-essential cookies</li>
                            <li>Withdraw from the beta testing program at any time</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">8. Data Retention</h2>
                        <p>Medical consultation data: <strong className="text-[#F1F5F9]">Maximum 24 hours</strong>, then automatically purged. Account data: Retained until you request deletion. Technical logs: 30 days maximum.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">9. Contact</h2>
                        <p>For privacy inquiries, contact us at <a href="mailto:admin@cliniq.one" className="text-[#2DD4BF] hover:underline">admin@cliniq.one</a>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
