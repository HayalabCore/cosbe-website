'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useState } from 'react';
import Image from 'next/image';

export default function AiAgentPage() {
  const t = useTranslations('aiAgent');
  const [activeTab, setActiveTab] = useState<'construction' | 'retail' | 'manufacturing'>('construction');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/50 to-indigo-600/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Breadcrumb */}
          <nav className="text-sm mb-8 text-white/90">
            <Link href="/" className="hover:underline">{t('breadcrumb.home')}</Link>
            <span className="mx-2">›</span>
            <Link href="/ai-lab" className="hover:underline">{t('breadcrumb.aiLab')}</Link>
            <span className="mx-2">›</span>
            <span>{t('breadcrumb.current')}</span>
          </nav>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
            {t('heroTitle')}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <section className="py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-5xl md:text-6xl font-bold text-blue-400 leading-tight">
                {t('title')}
              </h2>
              
              <p className="text-2xl md:text-3xl text-blue-300 leading-relaxed font-light">
                {t('subtitle')}
              </p>
              
              <div className="h-px bg-gray-300 my-8"></div>
              
              <div className="space-y-6 text-gray-700">
                <p className="text-lg leading-relaxed">
                  {t('intro1')}
                </p>
                
                <p className="text-lg leading-relaxed font-medium">
                  {t('intro2')}
                </p>
                
                <p className="text-lg leading-relaxed">
                  {t('agentDescription')}
                </p>
                
                <p className="text-lg leading-relaxed">
                  {t('agentDetail1')}
                </p>
                
                <p className="text-lg leading-relaxed">
                  {t('agentDetail2')}
                </p>
              </div>
            </div>
            
            <div className="relative lg:ml-8">
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                {/* Hero Image */}
                <Image 
                  src="/ai-agent/AdobeStock_1221848534.jpg" 
                  alt="AI Agent Visual" 
                  width={600} 
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Problems Section */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto bg-gray-50 rounded-3xl shadow-lg p-10 md:p-16">
            <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
              {t('problems.title')}
            </h3>
            <ul className="space-y-6 mb-12">
              <li className="flex items-start gap-4">
                <span className="text-gray-800 mt-1.5 text-xl font-bold">•</span>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {t('problems.item1')}
                </p>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-gray-800 mt-1.5 text-xl font-bold">•</span>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {t('problems.item2')}
                </p>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-gray-800 mt-1.5 text-xl font-bold">•</span>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {t('problems.item3')}
                </p>
              </li>
              <li className="flex items-start gap-4">
                <span className="text-gray-800 mt-1.5 text-xl font-bold">•</span>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {t('problems.item4')}
                </p>
              </li>
            </ul>
            
            {/* CTA Button */}
            <div className="text-center">
              <Link href="/contact">
                <button className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-12 py-5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl">
                  {t('ctaConsult')}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* What is AI Agent Section */}
        <section className="py-20 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-sm">
                CosBE
              </div>
              <span className="text-gray-600 text-sm">{t('whatIs.badge')}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-blue-400 mb-8">
              {t('whatIs.title')}
            </h2>
            
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-10 leading-relaxed">
              {t('whatIs.subtitle')}
            </h3>
            
            <ul className="space-y-5 mb-16 max-w-5xl">
              <li className="flex items-start gap-4">
                <svg className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-gray-700 text-lg leading-relaxed">{t('whatIs.point1')}</p>
              </li>
              <li className="flex items-start gap-4">
                <svg className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-gray-700 text-lg leading-relaxed">{t('whatIs.point2')}</p>
              </li>
            </ul>

            {/* Process Steps */}
            <div className="grid md:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-lg p-8 h-full">
                  <div className="absolute -top-3 left-6">
                    <span className="inline-block bg-blue-500 text-white text-sm px-4 py-1.5 rounded font-semibold">
                      {t('process.step1.number')}
                    </span>
                  </div>
                  <div className="w-20 h-20 mx-auto mb-6 mt-4 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-200">
                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-3 text-lg text-center">{t('process.step1.title')}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('process.step1.description')}</p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-gray-400 text-3xl z-10">›</div>
              </div>
              
              {/* Step 2 */}
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-lg p-8 h-full">
                  <div className="absolute -top-3 left-6">
                    <span className="inline-block bg-blue-500 text-white text-sm px-4 py-1.5 rounded font-semibold">
                      {t('process.step2.number')}
                    </span>
                  </div>
                  <div className="w-20 h-20 mx-auto mb-6 mt-4 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-200">
                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-3 text-lg text-center">{t('process.step2.title')}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('process.step2.description')}</p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-gray-400 text-3xl z-10">›</div>
              </div>
              
              {/* Step 3 */}
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-lg p-8 h-full">
                  <div className="absolute -top-3 left-6">
                    <span className="inline-block bg-blue-500 text-white text-sm px-4 py-1.5 rounded font-semibold">
                      {t('process.step3.number')}
                    </span>
                  </div>
                  <div className="w-20 h-20 mx-auto mb-6 mt-4 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-200">
                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-3 text-lg text-center">{t('process.step3.title')}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('process.step3.description')}</p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-gray-400 text-3xl z-10">›</div>
              </div>
              
              {/* Step 4 */}
              <div>
                <div className="bg-white rounded-2xl shadow-lg p-8 h-full">
                  <div className="absolute -top-3 left-6">
                    <span className="inline-block bg-blue-500 text-white text-sm px-4 py-1.5 rounded font-semibold">
                      {t('process.step4.number')}
                    </span>
                  </div>
                  <div className="w-20 h-20 mx-auto mb-6 mt-4 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-200">
                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-3 text-lg text-center">{t('process.step4.title')}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{t('process.step4.description')}</p>
                </div>
              </div>
            </div>

            {/* Industry Examples with Tabs */}
            <div className="mt-20">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">{t('industries.title')}</h3>
              <p className="text-gray-700 text-lg mb-10 leading-relaxed max-w-5xl">{t('industries.description')}</p>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-300 mb-8">
                <button 
                  onClick={() => setActiveTab('construction')}
                  className={`px-8 py-4 font-semibold text-lg transition-all ${
                    activeTab === 'construction' 
                      ? 'bg-gray-800 text-white border-b-4 border-gray-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('industries.construction.title')}
                </button>
                <button 
                  onClick={() => setActiveTab('retail')}
                  className={`px-8 py-4 font-semibold text-lg transition-all ${
                    activeTab === 'retail' 
                      ? 'bg-gray-800 text-white border-b-4 border-gray-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('industries.retail.title')}
                </button>
                <button 
                  onClick={() => setActiveTab('manufacturing')}
                  className={`px-8 py-4 font-semibold text-lg transition-all ${
                    activeTab === 'manufacturing' 
                      ? 'bg-gray-800 text-white border-b-4 border-gray-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('industries.manufacturing.title')}
                </button>
              </div>

              {/* Tab Content */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-10">
                {activeTab === 'construction' && (
                  <div>
                    <h4 className="text-3xl font-bold text-gray-800 text-center mb-12">{t('industries.construction.title')}</h4>
                    
                    <div className="grid lg:grid-cols-2 gap-10 items-start mb-12">
                      {/* Construction Image */}
                      <div className="rounded-xl overflow-hidden">
                        <Image 
                          src="/ai-agent/AdobeStock_501222037.jpg" 
                          alt="Construction Industry" 
                          width={500} 
                          height={320}
                          className="w-full h-80 object-cover"
                        />
                      </div>
                      
                      {/* Example Assignment */}
                      <div>
                        <div className="bg-gray-50 rounded-lg p-6 mb-8">
                          <h5 className="text-xl font-bold text-gray-800 mb-4">{t('industries.construction.problemTitle')}</h5>
                          <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.construction.problem1')}</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.construction.problem2')}</p>
                            </li>
                          </ul>
                        </div>
                        
                        {/* AI Agent Introduction */}
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h5 className="text-xl font-bold text-gray-800 mb-4">{t('industries.construction.solutionTitle')}</h5>
                          <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.construction.solution1')}</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.construction.solution2')}</p>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Merit Section */}
                    <div className="bg-gray-50 rounded-lg p-8">
                      <h5 className="text-xl font-bold text-gray-800 mb-6">{t('industries.construction.benefitTitle')}</h5>
                      <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                          <span className="text-gray-800 mt-1 font-bold">•</span>
                          <p className="text-gray-700 leading-relaxed">{t('industries.construction.benefit1')}</p>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-gray-800 mt-1 font-bold">•</span>
                          <p className="text-gray-700 leading-relaxed">{t('industries.construction.benefit2')}</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {activeTab === 'retail' && (
                  <div>
                    <h4 className="text-3xl font-bold text-gray-800 text-center mb-12">{t('industries.retail.title')}</h4>
                    
                    <div className="grid lg:grid-cols-2 gap-10 items-start mb-12">
                      {/* Retail Image */}
                      <div className="rounded-xl overflow-hidden">
                        <Image 
                          src="/ai-agent/AdobeStock_599853965.jpg" 
                          alt="Retail Industry" 
                          width={500} 
                          height={320}
                          className="w-full h-80 object-cover"
                        />
                      </div>
                      
                      {/* Example Assignment */}
                      <div>
                        <div className="bg-gray-50 rounded-lg p-6 mb-8">
                          <h5 className="text-xl font-bold text-gray-800 mb-4">{t('industries.retail.problemTitle')}</h5>
                          <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.retail.problem1')}</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.retail.problem2')}</p>
                            </li>
                          </ul>
                        </div>
                        
                        {/* AI Agent Introduction */}
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h5 className="text-xl font-bold text-gray-800 mb-4">{t('industries.retail.solutionTitle')}</h5>
                          <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.retail.solution1')}</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.retail.solution2')}</p>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Merit Section */}
                    <div className="bg-gray-50 rounded-lg p-8">
                      <h5 className="text-xl font-bold text-gray-800 mb-6">{t('industries.retail.benefitTitle')}</h5>
                      <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                          <span className="text-gray-800 mt-1 font-bold">•</span>
                          <p className="text-gray-700 leading-relaxed">{t('industries.retail.benefit1')}</p>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-gray-800 mt-1 font-bold">•</span>
                          <p className="text-gray-700 leading-relaxed">{t('industries.retail.benefit2')}</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {activeTab === 'manufacturing' && (
                  <div>
                    <h4 className="text-3xl font-bold text-gray-800 text-center mb-12">{t('industries.manufacturing.title')}</h4>
                    
                    <div className="grid lg:grid-cols-2 gap-10 items-start mb-12">
                      {/* Manufacturing Image */}
                      <div className="rounded-xl overflow-hidden">
                        <Image 
                          src="/ai-agent/AdobeStock_599853965.jpg" 
                          alt="Manufacturing Industry" 
                          width={500} 
                          height={320}
                          className="w-full h-80 object-cover"
                        />
                      </div>
                      
                      {/* Example Assignment */}
                      <div>
                        <div className="bg-gray-50 rounded-lg p-6 mb-8">
                          <h5 className="text-xl font-bold text-gray-800 mb-4">{t('industries.manufacturing.problemTitle')}</h5>
                          <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.manufacturing.problem1')}</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.manufacturing.problem2')}</p>
                            </li>
                          </ul>
                        </div>
                        
                        {/* AI Agent Introduction */}
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h5 className="text-xl font-bold text-gray-800 mb-4">{t('industries.manufacturing.solutionTitle')}</h5>
                          <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.manufacturing.solution1')}</p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="text-gray-800 mt-1 font-bold">•</span>
                              <p className="text-gray-700 leading-relaxed">{t('industries.manufacturing.solution2')}</p>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Merit Section */}
                    <div className="bg-gray-50 rounded-lg p-8">
                      <h5 className="text-xl font-bold text-gray-800 mb-6">{t('industries.manufacturing.benefitTitle')}</h5>
                      <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                          <span className="text-gray-800 mt-1 font-bold">•</span>
                          <p className="text-gray-700 leading-relaxed">{t('industries.manufacturing.benefit1')}</p>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-gray-800 mt-1 font-bold">•</span>
                          <p className="text-gray-700 leading-relaxed">{t('industries.manufacturing.benefit2')}</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">AI</div>
            <span className="text-gray-600 text-sm">{t('features.badge')}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-blue-600 mb-4">
            {t('features.title')}
          </h2>
          <p className="text-gray-700 mb-8">{t('features.subtitle')}</p>
          
          <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
            <Image 
              src="/ai-agent/AdobeStock_1362892047-scaled.jpeg" 
              alt="AI Agent Features" 
              width={1200} 
              height={500}
              className="w-full h-auto object-cover"
            />
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h4 className="font-bold text-gray-800 mb-3">{t('features.feature1.title')}</h4>
              <hr className="border-gray-200 mb-3" />
              <p className="text-gray-600 text-sm mb-4">{t('features.feature1.description')}</p>
              <p className="text-sm font-medium text-gray-700">{t('features.feature1.benefit')}</p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-gray-600">• {t('features.feature1.point1')}</li>
                <li className="text-sm text-gray-600">• {t('features.feature1.point2')}</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h4 className="font-bold text-gray-800 mb-3">{t('features.feature2.title')}</h4>
              <hr className="border-gray-200 mb-3" />
              <p className="text-gray-600 text-sm mb-4">{t('features.feature2.description')}</p>
              <p className="text-sm font-medium text-gray-700">{t('features.feature2.benefit')}</p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-gray-600">• {t('features.feature2.point1')}</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h4 className="font-bold text-gray-800 mb-3">{t('features.feature3.title')}</h4>
              <hr className="border-gray-200 mb-3" />
              <p className="text-gray-600 text-sm mb-4">{t('features.feature3.description')}</p>
              <p className="text-sm font-medium text-gray-700">{t('features.feature3.benefit')}</p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-gray-600">• {t('features.feature3.point1')}</li>
                <li className="text-sm text-gray-600">• {t('features.feature3.point2')}</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h4 className="font-bold text-gray-800 mb-3">{t('features.feature4.title')}</h4>
              <hr className="border-gray-200 mb-3" />
              <p className="text-gray-600 text-sm mb-4">{t('features.feature4.description')}</p>
              <p className="text-sm font-medium text-gray-700">{t('features.feature4.benefit')}</p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-gray-600">• {t('features.feature4.point1')}</li>
                <li className="text-sm text-gray-600">• {t('features.feature4.point2')}</li>
              </ul>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="text-center mt-10">
            <Link href="/contact">
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 hover:shadow-lg transition-all duration-200 text-lg font-semibold">
                {t('ctaConsult')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </Link>
          </div>
        </section>

        {/* Deployment Process Section */}
        <section className="py-16 bg-gray-50/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">AI</div>
              <span className="text-gray-600 text-sm">{t('deployment.badge')}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-blue-600 mb-6">
              {t('deployment.title')}
            </h2>
            <p className="text-gray-700 mb-4">{t('deployment.description1')}</p>
            <p className="text-gray-700 mb-4">{t('deployment.description2')}</p>
            <p className="text-gray-700 mb-8">{t('deployment.description3')}</p>
            
            {/* Deployment Flow Diagram */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <Image 
                src="/ai-agent/flow.jpg" 
                alt="Deployment Flow" 
                width={1200} 
                height={400}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 bg-gray-50/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">AI</div>
              <span className="text-gray-600 text-sm">{t('pricing.badge')}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-blue-600 mb-6">
              {t('pricing.title')}
            </h2>
            <p className="text-gray-700 mb-8">{t('pricing.description')}</p>
            
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="mb-6">
                <p className="text-gray-700 text-lg">
                  {t('pricing.feeLabel')}: <span className="text-2xl font-bold text-gray-900">{t('pricing.fee')}</span>
                </p>
                <p className="text-gray-600 mt-1">{t('pricing.feeNote')}</p>
              </div>
              <div>
                <p className="text-gray-700 text-lg">
                  {t('pricing.maintenanceLabel')}: <span className="text-2xl font-bold text-gray-900">{t('pricing.maintenance')}</span>
                </p>
                <p className="text-gray-600 mt-1">{t('pricing.maintenanceNote')}</p>
              </div>
            </div>
            
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden">
                <thead className="bg-blue-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left"></th>
                    <th className="px-6 py-4 text-center font-bold">CosBE</th>
                    <th className="px-6 py-4 text-center font-bold">{t('pricing.companyA')}</th>
                    <th className="px-6 py-4 text-center font-bold">{t('pricing.companyB')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-blue-50">
                    <td className="px-6 py-4 font-semibold text-white bg-blue-500">{t('pricing.agileDev')}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-green-500">
                        <span className="text-green-500 text-xl">○</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-green-500">
                        <span className="text-green-500 text-xl">○</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-green-500">
                        <span className="text-green-500 text-xl">○</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-blue-50">
                    <td className="px-6 py-4 font-semibold text-white bg-blue-500">{t('pricing.consulting')}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-green-500">
                        <span className="text-green-500 text-xl">○</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-red-500 text-2xl font-bold">✕</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-red-500 text-2xl font-bold">✕</span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-blue-50">
                    <td className="px-6 py-4 font-semibold text-white bg-blue-500">{t('pricing.serverTools')}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-green-500">
                        <span className="text-green-500 text-xl">○</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-red-500 text-2xl font-bold">✕</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-red-500 text-2xl font-bold">✕</span>
                    </td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4 font-semibold text-white bg-blue-500">{t('pricing.priceLabel')}</td>
                    <td className="px-6 py-4 text-center">
                      <p className="font-bold text-lg">{t('pricing.cosbePriceMain')}</p>
                      <p className="font-bold text-lg">{t('pricing.cosbePriceSub')}</p>
                      <p className="text-sm text-gray-600 mt-1">{t('pricing.minMonths')}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="font-bold text-lg">{t('pricing.companyAPrice')}</p>
                      <p className="text-sm text-gray-600 mt-1">{t('pricing.companyAPriceSub')}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="font-bold text-lg">{t('pricing.companyBPrice')}</p>
                      <p className="text-sm text-gray-600 mt-1">{t('pricing.companyBPriceSub')}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* CTA Button */}
            <div className="text-center mt-10">
              <Link href="/contact">
                <button className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200 text-lg font-semibold shadow-lg">
                  {t('ctaConsult')}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">AI</div>
              <span className="text-gray-600 text-sm">{t('faq.badge')}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-blue-600 mb-8">
              {t('faq.title')}
            </h2>
            
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <details key={num} className="bg-white rounded-xl shadow-lg overflow-hidden group">
                  <summary className="px-6 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">Q</span>
                      <span className="font-medium text-gray-800">{t(`faq.q${num}`)}</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-4">
                    <div className="flex items-start gap-4 pt-4 border-t border-gray-100">
                      <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">A</span>
                      <p className="text-gray-700">{t(`faq.a${num}`)}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="relative bg-gradient-to-r from-gray-800 to-gray-900 py-16 px-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
            <div className="relative max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {t('finalCta.title')}
              </h2>
              <p className="text-white/90 mb-2">{t('finalCta.description1')}</p>
              <p className="text-white/90 mb-8">{t('finalCta.description2')}</p>
              <Link href="/contact">
                <button className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200 text-lg font-semibold shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('finalCta.button')}
                </button>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
