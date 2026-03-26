import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Disclosure — cliniq.one',
    description: 'How cliniq.one uses artificial intelligence in healthcare delivery.',
};

export default function AIDisclosurePage() {
    return (
        <div className="min-h-screen bg-white text-text-primary">
            <div className="max-w-3xl mx-auto px-6 py-20">
                <a href="/" className="inline-flex items-center gap-2 text-sm text-accent hover:underline mb-10">
                    ← Back to cliniq.one
                </a>
                <h1 className="text-4xl font-bold text-navy mb-2">AI Disclosure</h1>
                <p className="text-text-muted text-sm mb-10">Last updated: March 25, 2026</p>

                <div className="prose prose-sm max-w-none space-y-8 text-text-secondary leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-navy mb-3">1. AI in cliniq.one</h2>
                        <p>cliniq.one uses artificial intelligence to enhance — not replace — healthcare delivery. This document provides transparent disclosure about how AI is used throughout the platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-navy mb-3">2. What AI Does</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong className="text-navy">Medical Intake Interview</strong> — An AI chatbot conducts a structured medical interview, gathering symptoms, medical history, medications, allergies, and review of systems.</li>
                            <li><strong className="text-navy">Smart Specialty Routing</strong> — AI analyzes symptoms to recommend the appropriate medical specialty (or multiple specialties for complex cases).</li>
                            <li><strong className="text-navy">Clinical Note Generation</strong> — AI structures the patient&apos;s responses into a professional clinical document for the reviewing physician.</li>
                            <li><strong className="text-navy">Safety Verification</strong> — 19 AI-powered safety layers continuously check for drug interactions, allergy conflicts, dosage errors, and red-flag symptoms.</li>
                            <li><strong className="text-navy">Medical Spelling &amp; Terminology</strong> — AI auto-corrects medical terms and drug names to ensure accuracy.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-navy mb-3">3. What AI Does NOT Do</h2>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mt-3">
                            <ul className="list-disc pl-6 space-y-2 text-red-700">
                                <li>AI does <strong>not</strong> diagnose medical conditions</li>
                                <li>AI does <strong>not</strong> prescribe medications</li>
                                <li>AI does <strong>not</strong> make treatment decisions</li>
                                <li>AI does <strong>not</strong> replace licensed physicians</li>
                                <li>AI does <strong>not</strong> provide emergency medical advice</li>
                            </ul>
                        </div>
                        <p className="mt-4">All medical decisions are made exclusively by licensed, human healthcare providers who review the AI-generated clinical notes and independently determine diagnosis and treatment.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-navy mb-3">4. AI Model Information</h2>
                        <p>cliniq.one utilizes large language models (LLMs) with custom medical prompts developed by board-certified physicians. The AI operates under strict behavioral guidelines:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Cannot be manipulated into providing diagnosis or treatment</li>
                            <li>Enforces turn limits to prevent conversation abuse</li>
                            <li>Detects and redirects emergency situations</li>
                            <li>Maintains professional medical interview boundaries</li>
                            <li>Supports bilingual operation (Arabic &amp; English) with maintained medical accuracy</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-navy mb-3">5. Human Oversight</h2>
                        <p>Every AI-generated output passes through human review:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Licensed physicians review all clinical notes before responding</li>
                            <li>Doctors can modify, override, or reject any AI-generated content</li>
                            <li>Platform administrators monitor AI behavior and safety metrics</li>
                            <li>Regular audits ensure AI alignment with clinical guidelines (WHO, ACP, AAFP)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-navy mb-3">6. Patient Data &amp; AI</h2>
                        <p>Patient data shared with the AI during medical interviews is:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>Processed in real-time, session-based memory only</li>
                            <li>Not used to train AI models</li>
                            <li>Not stored beyond the 24-hour consultation window</li>
                            <li>Not shared with any third parties for marketing or research</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-navy mb-3">7. Limitations</h2>
                        <p>AI systems have inherent limitations. Users should be aware that:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li>AI may occasionally misinterpret ambiguous symptoms</li>
                            <li>AI cannot perform physical examinations</li>
                            <li>AI recommendations are assistive suggestions, not medical orders</li>
                            <li>Complex or rare conditions may require additional in-person evaluation</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-navy mb-3">8. Contact</h2>
                        <p>For questions about our use of AI, contact us at <a href="mailto:admin@cliniq.one" className="text-accent hover:underline">admin@cliniq.one</a>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
