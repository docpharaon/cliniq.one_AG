import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service — cliniq.one',
    description: 'Terms and conditions for using the cliniq.one telemedicine platform.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0A0E1A] text-[#F1F5F9]">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <a href="/" className="inline-flex items-center gap-2 text-sm text-[#2DD4BF] hover:underline mb-10">
                    ← Back to cliniq.one
                </a>
                <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
                <p className="text-[#64748B] text-sm mb-10">Last updated: March 25, 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-8 text-[#94A3B8] leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing or using cliniq.one (&quot;the Platform&quot;), operated by Momencraft, you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">2. Description of Service</h2>
                        <p>cliniq.one is an AI-powered telemedicine platform that facilitates virtual medical consultations between patients and licensed healthcare providers. The Platform includes AI-driven medical intake interviews, smart specialty routing, structured clinical documentation, and e-prescription support.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">3. Medical Disclaimer</h2>
                        <p>The AI components of cliniq.one are assistive tools designed to support — not replace — licensed physicians. All medical decisions, diagnoses, treatment plans, and prescriptions are made exclusively by licensed, human healthcare providers. The AI does not diagnose, treat, or prescribe independently.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">4. Eligibility</h2>
                        <p>You must be at least 18 years old to use the Platform independently. Minors may use the Platform under the supervision of a parent or legal guardian. The Platform currently serves users in the Kingdom of Saudi Arabia (KSA) and the United Arab Emirates (UAE).</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">5. User Responsibilities</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide accurate and truthful medical information during consultations</li>
                            <li>Do not use the Platform for emergency medical situations — call local emergency services (997 in KSA, 998 in UAE)</li>
                            <li>Keep your account credentials secure</li>
                            <li>Do not share, reproduce, or distribute consultation content</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">6. Privacy &amp; Data Handling</h2>
                        <p>cliniq.one follows a zero-storage philosophy. Medical data is processed in real-time session memory and automatically purged within 24 hours. For full details, see our <a href="/privacy" className="text-[#2DD4BF] hover:underline">Privacy Policy</a>.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">7. Intellectual Property</h2>
                        <p>All content, technology, workflows, and AI models used by cliniq.one are the intellectual property of Momencraft. The cliniq.one concept, workflow architecture, and AI-driven multi-specialty consultation model are under patent filing in Saudi Arabia and the broader Middle East region.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">8. Beta Testing Program</h2>
                        <p>The Platform is currently in a beta testing phase. Features may change, and the service may experience downtime. Beta testers agree to provide feedback and understand that the Platform is provided &quot;as-is&quot; during this phase.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">9. Limitation of Liability</h2>
                        <p>To the maximum extent permitted by law, cliniq.one and Momencraft shall not be liable for any indirect, incidental, or consequential damages arising from use of the Platform. The Platform is not a substitute for in-person medical care in emergency situations.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">10. Governing Law</h2>
                        <p>These Terms shall be governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be resolved in the courts of Riyadh, Saudi Arabia.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#F1F5F9] mb-3">11. Contact</h2>
                        <p>For questions about these Terms, contact us at <a href="mailto:admin@cliniq.one" className="text-[#2DD4BF] hover:underline">admin@cliniq.one</a>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
