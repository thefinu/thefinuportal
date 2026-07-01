import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default async function PrivacyPage() {
    let privacyData: { updatedDate?: string; content?: string } = {};
    try {
        const res = await fetch(`${API_URL}/content/privacy`, { cache: 'no-store' });
        if (res.ok) {
            const json = await res.json();
            if (json.data) privacyData = json.data;
        }
    } catch { /* use defaults */ }

    const updatedDate = privacyData.updatedDate || "September 2023";
    const customContent = privacyData.content || null;

    return (
        <div className="min-h-screen bg-white font-sans">
            <PublicHeader />

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <Link href="/" className="inline-flex items-center text-secondary hover:text-secondary/80 transition-colors mb-8 group">
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to Home
                    </Link>

                    <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
                    <p className="text-slate-500 mb-6 border-b border-slate-100 pb-6 text-sm">Updated {updatedDate}</p>

                    {customContent ? (
                        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: customContent }} />
                    ) : (
                    <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            ThefinU, LLC. (“ThefinU”, “Us”, “We” or “Our”) is committed to protecting your privacy. This Privacy Policy is intended to describe for you, as an individual who is a user of thefinu.com or our services, the information we collect, how that information may be used, with whom it may be shared, and your choices about such uses and disclosures. We encourage you to read this Privacy Policy carefully when using our website or services or transacting business with us. By using our website, you are accepting the practices described in this Privacy Policy. If you have any questions about our privacy practices, please refer to the end of this Privacy Policy for information on how to contact us.
                        </p>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-4 mb-4">Information We Collect About You</h2>
                            <p>
                                We may collect personal information that can identify you, such as your name and email address, and other information that does not identify you. When you provide personal information through our website, the information may be sent to servers located in the United States and other countries around the world.
                            </p>
                            <p className="mt-4">We may collect and store any personal information you enter on our website or provide to us in some other manner. This includes identifying information, such as your name, address, email address, and telephone number. We also may request information about your interests and activities, your gender and age, your financial life and other demographic information, as well as public information such as reviews and comments, and other information you view or contribute to the website.</p>
                            <p className="mt-4">If you choose to use Thefinu’s service, we will request usernames and passwords in order to access information as it relates to your bank account and credit cards, investment account, or loans. Thefinu does not store your usernames or passwords for financial institutions on its servers. We do not store your credit card number when you sign up for a paid subscription.</p>
                            <p className="mt-4">We work with our partner Plaid to collect your financial institution account transaction data and investment holdings from your accounts on your behalf. Your transaction data is transmitted securely with TLS and stored on our servers, where your transaction descriptions are secured with 256-bit AES encryption. Plaid also stores your data, subject to their own privacy policy.</p>
                            <p className="mt-4">We use various technologies to collect information from your computer and about your activities on our site. As is true of most websites, we gather certain information automatically and store it in log files. This information may include Internet Protocol (IP) addresses, browser type, Internet Service Provider (ISP), referring/exit pages, operating system, date/time stamp, and/or clickstream data. We do not link this automatically collected data to other information we collect about you.</p>
                            <p className="mt-4">Technologies such as cookies and scripts are used by Thefinu and our third party analytics providers. These technologies are used in analyzing trends, administering the site, tracking users’ movements around the site and to gather demographic information about our user base as a whole. We may receive reports based on the use of these technologies by these companies on an individual as well as aggregated basis.</p>
                            <p className="mt-4">We use cookies to remember users’ settings, for authentication, and to measure advertising and promotional effectiveness. Users can control the use of cookies at the individual browser level. If you reject cookies, you may still use our site, but your ability to use some features or areas of our site may be limited.</p>
                            <p className="mt-4">Some of our pages utilize framing techniques to serve content from our partners, including Google and Plaid, while preserving the look and feel of our site. Please be aware that you are providing your personal information to these third parties.</p>
                            <div className="p-6 bg-amber-50 text-amber-800 rounded-2xl border border-slate-100 my-8">
                                <h4 className="font-bold text-slate-900 mb-2">Financial Account Access</h4>
                                <p className="text-slate-600 m-0">
                                    If you choose to use our service, we will request credentials via Plaid to access your bank account information. <strong>ThefinU does not store your usernames or passwords for financial institutions on its servers.</strong>
                                </p>
                            </div>
                            <p>
                                We work with <strong>Plaid</strong> to collect your transaction data. This data is transmitted securely via TLS and stored on our servers using 256-bit AES encryption.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">How We Use Your Information</h2>
                            <p>We use the data we collect to:</p>
                            <p>We may use information that we collect about you to: deliver the products and services that you have requested; provide you with customer support; perform research and analysis about your use of our products or services; communicate with you by email or telephone about ThefinU products or services; develop and display content tailored to your interests on our site; enforce our terms and conditions; manage our business; and perform functions as otherwise described to you at the time of collection.</p>
                            <p className="mt-4">We aggregate your data and similar data from other users into larger sets of anonymous personal financial data. This aggregated information does not identify particular users or otherwise allow anyone to recover sensitive information about individual users. Aggregate information belongs to Thefinu, and is not subject to this Privacy Policy.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Data Security & Protection</h2>
                            <p>We take appropriate security measures (including physical, electronic and procedural measures) to help safeguard your personal information from unauthorized access and disclosure. For example, only authorized employees are permitted to access personal information, and they may do so only for permitted business functions. In addition, we use encryption in the transmission of your sensitive personal information (such as credit card number) between your computer and our system, we encrypt the transmission of that information using Transport Layer Security (TLS) technology, and we also use firewalls to help prevent unauthorized persons from gaining access to your personal information. We want you to feel confident using our website to transact business.
                            </p>
                            <p className="mt-4">However, no system can be completely secure.</p>
                            <p className="mt-4">Therefore, although we take steps to secure your information, we do not promise, and you should not expect, that your personal information, searches, or other communications will always remain secure. If you have any questions about security on our website, you can contact us support@thefinu.com.</p>
                           <p className="mt-4">We May Share Personal Information.</p>
                           <p className="mt-4">We want you to understand when and with whom we may share personal or other information we have collected about you or your activities on our website or while using our services.</p>
                           <p className="mt-4">We will share your personal information with third parties only in the ways that are described in this Privacy Policy.</p>
                           <p className="mt-4">We do not sell your personal information to third parties.</p>
                           <p className="mt-4">We may share your personal information with our authorized service providers that perform certain services on our behalf. These services may include processing credit card payments and collecting transaction and account information. These service providers may have access to personal information needed to perform their functions.</p>
                           <p className="mt-4">We also may disclose your information: 1) ­­In response to a subpoena or similar investigative demand, a court order, or a request for cooperation from law enforcement or other government or regulatory agency; to establish or exercise our legal rights; to defend against legal claims; or as otherwise required by law. In such cases, we may raise or waive any legal objection or right available to us. 2) ­When we believe disclosure is appropriate in connection with efforts to investigate, prevent, or take other action regarding illegal activity, suspected fraud or other wrongdoing; to protect and defend the rights, property or safety of our company, our users, our employees, or others; to comply with applicable law or cooperate with law enforcement; or to enforce our website terms and conditions or other agreements or policies. 3) To any other third party with your prior consent to do so.</p>
                           <p className="mt-4">If ThefinU is involved in a merger, acquisition, or sale of all or a portion of its assets, you will be notified via email and/or a prominent notice on our website of any change in ownership or uses of your personal information, as well as any choices you may have regarding your personal information.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Third Parties</h2>
                            <p>Any third parties to whom we may disclose personal information, including Google and Plaid, may have their own privacy policies which describe how they use and disclose personal information. Those policies will govern use, handling, and disclosure of your personal information once we have shared it with those third parties as described in this Privacy Policy. If you want to learn more about their privacy practices, we encourage you to visit the websites of those third parties. These entities or their servers may be located either inside or outside the United States.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Third-Party Websites</h2>
                            <p>There are places on our website where you may click on a link to access other websites that do not operate under this Privacy Policy. For example, to open your Google Sheet™, you will be taken to a Google website that we do not control. These third-party websites may independently solicit and collect information, including personal information, from you and, in some instances, provide us with information about your activities on those websites. We recommend that you consult the privacy policies of all third-party websites you visit by clicking on the “privacy” link typically located at the bottom of the webpage you are visiting.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">No Rights of Third Parties</h2>
                            <p>This Privacy Policy does not create rights enforceable by third parties or require disclosure of any personal information relating to users of the website.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">How You Can Access Your Information</h2>
                            <p>If you have an online account with us, you have the ability to delete your personal information online and close your account by contacting our support team at support@thefinu.com.</p>
                            <p>If you cancel your account we will delete your personal financial and transaction data. After you close your account, you will not be able to sign in to our website or access any of your personal information. However, you can open a new account at any time. If you close your account, we may still retain certain information associated with your account (such as your email address and certain communications with you) for analytical purposes and recordkeeping integrity, as well as to prevent fraud, enforce our terms and conditions, take actions we deem necessary to protect the integrity of our website or our users, or take other actions otherwise permitted by law. If you close your account, we will delete the account  data we have downloaded from your institutions.</p>
                            <p>In addition, if certain information has been provided to third parties as described in this Privacy Policy, such as transaction data uploaded to your Google Sheet™, retention of that information will be subject to those third parties’ policies.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Choices About Communication</h2>
                            <p>You may choose to stop receiving our newsletter or marketing emails by following the unsubscribe instructions included in these emails or you can contact us at support@thefinu.com.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Blogs, Bulletin Boards, Reviews, and Chat Rooms</h2>
                            <p>We may provide areas on our websites where you can post information about yourself and others; communicate with others; post reviews of products, establishments, and the like; and upload content (e.g. pictures, videos, audio files, etc.). Whenever you voluntarily disclose personal information on publicly viewable web pages, that information will be publicly available and can be collected and used by others. For example, if you post your email address, you may receive unsolicited messages. We cannot control who reads your posting or what other users may do with the information you voluntarily post, so we encourage you to exercise discretion and caution with respect to your personal information.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Children’s Online Privacy Protection Act (COPPA)</h2>
                            <p>We are committed to protecting the privacy of children. Visitors under 18 years of age are not permitted to use and/or submit their personal information at any Site. We do not knowingly solicit or collect information from visitors under 18 years of age. If we obtain actual knowledge that we have collected personal information about an individual under 18 years of age, that information will be immediately deleted from our website. We encourage parents and guardians to spend time online with their children and to participate and monitor the interactive activities of their children.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Social Media Widgets</h2>
                            <p>Our website may include social media features and widgets, such as a share button. These features may collect your IP address, which page you are visiting on our site, and may set a cookie to enable the feature to function properly. Social media features and widgets are either hosted by a third party or hosted directly on our website. Your interactions with these features are governed by the privacy policy of the company providing the features.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Visiting our websites from outside the United States</h2>
                            <p>This Privacy Policy is intended to cover collection of information on our website from residents of the United States. If you are visiting our website from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States where our servers are located and our central database is operated. The data protection and other laws of the United States and other countries might not be as comprehensive as those in your country. Please be assured that we seek to take reasonable steps to ensure that your privacy is protected. By using our services, you understand that your information may be transferred to our facilities and those third parties with whom we share it as described in this Privacy Policy.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">Changes to this Privacy Policy</h2>
                            <p>We will occasionally update this Privacy Policy to reflect changes in our practices and services. When we post changes to this Privacy Policy, we will revise the “last updated” date at the bottom of this document. If we make any material changes in the way we collect, use, and/or share your personal information, we will notify you by sending an email to the email address you most recently provided us in your account registration (unless we do not have such an email address), and/or by prominently posting notice of the changes on our website prior to the change becoming effective. We recommend that you check our website from time to time to inform yourself of any changes in this Privacy Policy or any of our other policies.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">How to Contact Us</h2>
                            <p>If you have any questions about this Privacy Policy or our information-handling practices please contact us at support@thefinu.com</p>
                        </section>

                    </div>
                    )}
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
