"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";

export default function PrivacyPolicyPage() {
  const t = useTranslations("privacyPolicyPage");

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[300px] md:h-[350px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/company/AdobeStock_578648891_Preview.jpeg"
            alt="Privacy Policy Background"
            fill
            className="object-cover"
            priority
          />
          {/* Blue Overlay */}
          <div className="absolute inset-0 bg-[#549fe3]/60"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{t("heroTitle")}</h1>
          <p className="text-lg md:text-xl opacity-90">{t("heroSubtitle")}</p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-gray-50 py-3 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-[#549fe3] flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {t("breadcrumb.home")}
            </Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-800">{t("breadcrumb.privacyPolicy")}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="prose prose-lg max-w-none">
            {/* Collecting and Using Your Personal Data */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4">
              {t("sections.collecting.title")}
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">
              {t("sections.typesOfData.title")}
            </h3>

            <h4 className="text-lg font-semibold text-gray-700 mt-6 mb-3">
              {t("sections.personalData.title")}
            </h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.personalData.description")}
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-600">
              <li>{t("sections.personalData.items.email")}</li>
              <li>{t("sections.personalData.items.name")}</li>
              <li>{t("sections.personalData.items.phone")}</li>
              <li>{t("sections.personalData.items.address")}</li>
              <li>{t("sections.personalData.items.usageData")}</li>
            </ul>

            <h4 className="text-lg font-semibold text-gray-700 mt-6 mb-3">
              {t("sections.usageData.title")}
            </h4>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.usageData.description1")}
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.usageData.description2")}
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.usageData.description3")}
            </p>

            {/* Tracking Technologies and Cookies */}
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">
              {t("sections.tracking.title")}
            </h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.tracking.description")}
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-3 text-gray-600">
              <li>
                <strong>{t("sections.tracking.cookies.title")}</strong>{" "}
                {t("sections.tracking.cookies.description")}
              </li>
              <li>
                <strong>{t("sections.tracking.webBeacons.title")}</strong>{" "}
                {t("sections.tracking.webBeacons.description")}
              </li>
            </ul>

            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.cookieTypes.description")}
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.cookieTypes.useBoth")}
            </p>

            <ul className="list-disc pl-6 mb-6 space-y-4 text-gray-600">
              <li>
                <strong>{t("sections.cookieTypes.necessary.title")}</strong>
                <br />
                <span className="text-sm">{t("sections.cookieTypes.necessary.type")}</span>
                <br />
                <span className="text-sm">{t("sections.cookieTypes.necessary.admin")}</span>
                <br />
                {t("sections.cookieTypes.necessary.purpose")}
              </li>
              <li>
                <strong>{t("sections.cookieTypes.acceptance.title")}</strong>
                <br />
                <span className="text-sm">{t("sections.cookieTypes.acceptance.type")}</span>
                <br />
                <span className="text-sm">{t("sections.cookieTypes.acceptance.admin")}</span>
                <br />
                {t("sections.cookieTypes.acceptance.purpose")}
              </li>
              <li>
                <strong>{t("sections.cookieTypes.functionality.title")}</strong>
                <br />
                <span className="text-sm">{t("sections.cookieTypes.functionality.type")}</span>
                <br />
                <span className="text-sm">{t("sections.cookieTypes.functionality.admin")}</span>
                <br />
                {t("sections.cookieTypes.functionality.purpose")}
              </li>
              <li>
                <strong>{t("sections.cookieTypes.performance.title")}</strong>
                <br />
                <span className="text-sm">{t("sections.cookieTypes.performance.type")}</span>
                <br />
                <span className="text-sm">{t("sections.cookieTypes.performance.admin")}</span>
                <br />
                {t("sections.cookieTypes.performance.purpose")}
              </li>
            </ul>

            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.cookieTypes.moreInfo")}
            </p>

            {/* Use of Your Personal Data */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.useOfData.title")}
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.useOfData.description")}
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-600">
              <li>{t("sections.useOfData.purposes.provide")}</li>
              <li>{t("sections.useOfData.purposes.manage")}</li>
              <li>{t("sections.useOfData.purposes.contract")}</li>
              <li>{t("sections.useOfData.purposes.contact")}</li>
              <li>{t("sections.useOfData.purposes.news")}</li>
              <li>{t("sections.useOfData.purposes.requests")}</li>
              <li>{t("sections.useOfData.purposes.transfers")}</li>
              <li>{t("sections.useOfData.purposes.other")}</li>
            </ul>

            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.sharing.description")}
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-600">
              <li>{t("sections.sharing.serviceProviders")}</li>
              <li>{t("sections.sharing.businessTransfers")}</li>
              <li>{t("sections.sharing.affiliates")}</li>
              <li>{t("sections.sharing.partners")}</li>
              <li>{t("sections.sharing.users")}</li>
              <li>{t("sections.sharing.consent")}</li>
            </ul>

            {/* Retention */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.retention.title")}
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.retention.description1")}
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.retention.description2")}
            </p>

            {/* Transfer */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.transfer.title")}
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.transfer.description1")}
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.transfer.description2")}
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.transfer.description3")}
            </p>

            {/* Disclosure */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.disclosure.title")}
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
              {t("sections.disclosure.business.title")}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.disclosure.business.description")}
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
              {t("sections.disclosure.lawEnforcement.title")}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.disclosure.lawEnforcement.description")}
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
              {t("sections.disclosure.otherLegal.title")}
            </h3>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.disclosure.otherLegal.description")}
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-600">
              <li>{t("sections.disclosure.otherLegal.items.comply")}</li>
              <li>{t("sections.disclosure.otherLegal.items.protect")}</li>
              <li>{t("sections.disclosure.otherLegal.items.prevent")}</li>
              <li>{t("sections.disclosure.otherLegal.items.safety")}</li>
              <li>{t("sections.disclosure.otherLegal.items.liability")}</li>
            </ul>

            {/* Security */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.security.title")}
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.security.description")}
            </p>

            {/* Service Providers */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.serviceProviders.title")}
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.serviceProviders.description")}
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
              {t("sections.analytics.title")}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.analytics.description")}
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
              {t("sections.emailMarketing.title")}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.emailMarketing.description")}
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-4">
              {t("sections.payments.title")}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.payments.description")}
            </p>

            {/* Links to Other Websites */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.links.title")}
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.links.description1")}
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.links.description2")}
            </p>

            {/* Changes to this Privacy Policy */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.changes.title")}
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.changes.description1")}
            </p>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.changes.description2")}
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {t("sections.changes.description3")}
            </p>

            {/* Contact Us */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-[#549fe3] pl-4 mt-10">
              {t("sections.contact.title")}
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {t("sections.contact.description")}
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-600">
              <li>
                {t("sections.contact.website")}{" "}
                <a
                  href="https://cosbe.inc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#549fe3] hover:underline"
                >
                  https://cosbe.inc/
                </a>
              </li>
              <li>
                {t("sections.contact.email")}{" "}
                <a
                  href="mailto:info@cosbe.inc"
                  className="text-[#549fe3] hover:underline"
                >
                  info@cosbe.inc
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 md:py-20">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <Image
            src="/company/AdobeStock_588248272_1_1.jpg"
            alt="CTA Background"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/80"></div>
        </div>

        {/* CTA Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 whitespace-pre-line">
            {t("cta.title")}
          </h2>
          <p className="text-gray-300 mb-2">{t("cta.description1")}</p>
          <p className="text-gray-300 mb-8">{t("cta.description2")}</p>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#549fe3] to-[#35eaff] text-white font-semibold rounded-full hover:opacity-90 transition-opacity shadow-lg"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            {t("cta.button")}
          </Link>
        </div>
      </section>
    </main>
  );
}
