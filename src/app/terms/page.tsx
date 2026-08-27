import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default async function TermsPage() {
    let termsData: { effectiveDate?: string; content?: string } = {};
    try {
        const res = await fetch(`${API_URL}/content/terms`, { cache: 'no-store' });
        if (res.ok) {
            const json = await res.json();
            if (json.data) termsData = json.data;
        }
    } catch { /* use defaults */ }

    const effectiveDate = termsData.effectiveDate || "October 25, 2025";
    const customContent = termsData.content || null;

    return (
        <div className="min-h-screen bg-white font-sans">
            <PublicHeader />

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <Link href="/" className="inline-flex items-center text-secondary hover:text-secondary/80 transition-colors mb-8 group">
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to Home
                    </Link>

                    <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2">Terms of Service</h1>
                    <p className="text-slate-500 mb-6 border-b border-slate-100 pb-6 text-sm">Effective Date: {effectiveDate}</p>

                    {customContent ? (
                        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: customContent.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+\s*=/gi, 'data-blocked=') }} />
                    ) : (
                    <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm">
                        <p>
                            These Terms of Service (the "Terms") are a legally binding agreement between you and ThefinU, LLC ("ThefinU," "we," "us," and "our") and govern your access to and use of our website located at <a href="https://www.thefinu.com" className="text-secondary font-medium hover:underline">www.thefinu.com</a> and the related personal finance synchronization services, including any spreadsheet Add-ons or Add-ins, offered via the Google Workspace™ Marketplace (collectively, the "Services").
                        </p>

                        <div className="p-4 bg-slate-50 border-l-4 border-primary rounded-r-lg">
                            <p className="font-bold text-slate-900 m-0 text-sm">
                                BY ACCESSING OR USING THE SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED TO BE BOUND BY THESE TERMS.
                            </p>
                        </div>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">1. Eligibility and Service Acknowledgment</h2>
                            <p>
                                ThefinU’s Services are offered and available only to users 18 years of age or older who reside in the United States or Canada. By using the Services, you represent and warrant that you meet all the foregoing eligibility requirements.
                            </p>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">You Acknowledge and Agree That:</h3>
                            <ul className="list-disc pl-6 space-y-3">
                                <li><strong>ThefinU is Not a Financial Institution:</strong> ThefinU is not a bank, investment advisor, financial planner, broker, or asset manager. The Services are merely tools to augment your financial tracking and decision-making. You are solely responsible for your savings, investment, and spending decisions.</li>
                                <li><strong>Accuracy:</strong> We do not guarantee the Services will be uninterrupted, timely, secure, or error-free. We are not responsible for delays, data corruption, or delivery failures resulting from internet traffic, third-party services, or issues with your Google or Plaid account.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">2. Linking Data Source Accounts and Data Aggregation (Plaid)</h2>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">A. Authorization for Data Retrieval</h3>
                            <p>
                                The Services facilitate the updating of your financial spreadsheets with up-to-date financial data ("Financial Data") retrieved from your banks, credit cards, and other third-party financial sources ("Data Sources").
                            </p>
                            <p>
                                You acknowledge and agree that ThefinU uses the services of data aggregators, including Plaid, Inc. ("Plaid"), to access your Financial Data on your behalf. By using the Services, you authorize and direct ThefinU, through Plaid, to access the Data Source accounts you designate, using the log-in credentials you provide. For the sole purpose of providing the Services, you hereby grant ThefinU (and Plaid) a limited power of attorney to retrieve and use your information.
                            </p>
                            <p className="p-4 bg-slate-50 rounded-lg italic text-slate-600 border border-slate-100">
                                YOU ACKNOWLEDGE AND AGREE THAT WHEN THEFINU, EITHER DIRECTLY OR THROUGH PLAID, ACCESSES AND RETRIEVES INFORMATION FROM THIRD PARTY SITES, THEFINU IS ACTING AS YOUR AGENT, AND NOT THE AGENT OR ON BEHALF OF THE THIRD PARTY.
                            </p>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">B. Plaid Disclosure</h3>
                            <p>
                                You acknowledge that Plaid, Inc. is a third-party service provider to ThefinU. For more information on how Plaid collects, uses, stores, and handles your data, please see Plaid’s commitment to its end-users on their official website.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">3. Subscription, Free Trials, and Cancellation</h2>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">A. Subscription and Billing</h3>
                            <p>The Services are offered on an Annual subscription basis.</p>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">B. Free Trial</h3>
                            <p>
                                You may be offered a 14-day free trial of the Services. If you do not cancel before the end of the free trial period, your subscription will automatically convert to a paid annual subscription, and your payment method will be charged the full annual fee.
                            </p>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">C. Cancellation and Refunds</h3>
                            <p>
                                You may cancel your subscription at any time via your account management dashboard or by contacting us at <a href="mailto:support@thefinu.com" className="text-secondary hover:underline">support@thefinu.com</a>. Your service remains active until the end of your current billing cycle after you cancel, and you will not be charged again for any future billing cycles. ThefinU does not provide refunds, pro-rated or otherwise, for any unused portion of your annual subscription term. All subscription fees paid are non-refundable.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">4. Privacy and Google Workspace™ Marketplace Compliance</h2>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">A. Privacy Policy</h3>
                            <p>
                                Your use of our Services is also governed by our Privacy Policy, which is incorporated by reference into these Terms. Please review it at: <Link href="/privacy" className="text-secondary hover:underline font-medium">/privacy</Link>.
                            </p>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">B. Google Limited Use Requirements</h3>
                            <p>By using the Google Add-on, you agree to the following mandatory limitations on our use of Google-sourced data:</p>
                            <ol className="list-decimal pl-6 space-y-3">
                                <li><strong>Limited Use:</strong> ThefinU's use of data obtained from Google APIs (including data from your Google Sheets™ or your Google Account information) is strictly limited to providing and improving the features of the Services that are visible to the user.</li>
                                <li><strong>Prohibition on Transfer/Sale:</strong> We will not transfer, sell, or use Google-sourced data for serving advertisements.</li>
                            </ol>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">5. Limitation of Liability and Warranties</h2>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">A. Disclaimer of Warranties</h3>
                            <p className="uppercase text-sm tracking-wide text-slate-500 line-clamp-none">
                                THE SERVICES AND ALL INFORMATION, PRODUCTS, AND OTHER CONTENT INCLUDED IN OR ACCESSIBLE FROM THE SITE AND SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. THEFINU AND ITS SERVICE PROVIDERS (INCLUDING PLAID) EXPRESSLY DISCLAIM ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                            </p>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">B. Limitation of Liability</h3>
                            <p className="uppercase text-sm tracking-wide text-slate-500">
                                YOU EXPRESSLY ACKNOWLEDGE AND AGREE that ThefinU, its service providers (including Plaid), and their respective affiliates shall not be liable for any direct, indirect, incidental, special, consequential, punitive, or exemplary damages, resulting from: (i) the use or inability to use the Services; (ii) the cost of procurement of substitute goods and services; or (iii) unauthorized access to or alteration of your data.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">6. Governing Law and Dispute Resolution</h2>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">A. Governing Law</h3>
                            <p>
                                You agree that your relationship with ThefinU under these Terms shall be governed by and construed in accordance with the laws of the State of Colorado, United States of America.
                            </p>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">B. Mandatory Binding Arbitration</h3>
                            <p>
                                You and ThefinU agree that any dispute, claim, or controversy shall be settled by mandatory and binding arbitration in Denver County, Colorado, before one commercial arbitrator.
                            </p>
                            <h3 className="text-md font-bold text-slate-900 mt-6 mb-3">C. Waiver of Class Action</h3>
                            <p>
                                You and ThefinU further agree that any arbitration shall be conducted on an individual basis and not as a class, consolidated, or representative action. You expressly waive your right to have a court or a jury decide any dispute.
                            </p>
                        </section>

                        <section className="border-t border-slate-100 pt-12">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 font-primary uppercase tracking-wider text-sm">Contact Information</h2>
                            <p className="text-slate-600 mb-4">
                                <strong>Changes to Terms:</strong> We may revise these Terms at any time. All changes are effective immediately upon posting. Your continued use of the Services following the posting of revised Terms means you accept and agree to the changes.
                            </p>
                            <div className="bg-slate-50 p-6 rounded-2xl">
                                <ul className="space-y-2">
                                    <li className="flex items-center text-slate-900 font-medium">
                                        <span className="w-20 text-slate-400 font-normal uppercase text-[10px] tracking-widest">Email</span>
                                        <a href="mailto:support@thefinu.com" className="text-secondary hover:underline">support@thefinu.com</a>
                                    </li>
                                    <li className="flex items-center text-slate-900 font-medium">
                                        <span className="w-20 text-slate-400 font-normal uppercase text-[10px] tracking-widest">Address</span>
                                        Denver, Colorado
                                    </li>
                                </ul>
                            </div>
                        </section>
                    </div>
                    )}
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
