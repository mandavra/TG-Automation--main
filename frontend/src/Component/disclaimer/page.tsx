'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ShieldAlert,
  TrendingDown,
  Lock,
  Info,
  FileText,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'

const Disclaimer = () => {
  const [headerHeight, setHeaderHeight] = useState(0)

  useEffect(() => {
    const header = document.querySelector('header')
    if (header) {
      const height = header.offsetHeight
      setHeaderHeight(height)
    }

    const handleResize = () => {
      if (header) {
        setHeaderHeight(header.offsetHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sections = [
    {
      title: 'No Investment Advice',
      icon: Info,
      content:
        'Vyom Research LLP is registered with SEBI as a Research Analyst (Registration No. INH000018221). We provide independent research and recommendations based on publicly available information and our analysis. However, we do not offer personalized investment advice or portfolio management services. It is important that you conduct your own due diligence and consult with a qualified financial advisor before making any investment decisions.',
    },
    {
      title: 'Market Risks',
      icon: TrendingDown,
      content:
        'Investing in securities markets involves inherent risks, including the risk of loss. The past performance of any security or financial instrument is not indicative of future results. Trading and investment decisions are made solely at your own discretion, and Vyom Research LLP shall not be responsible for any losses incurred by you. Always remember that trading or investing in securities markets is subject to market risks.',
    },
    {
      title: 'No Guarantee of Returns',
      icon: ShieldAlert,
      content:
        'Vyom Research LLP does not guarantee or provide any assurance of profits or returns from any recommendations, strategies, or services offered. All investments carry risks, and there is no guarantee of achieving the same or similar returns in the future.',
    },
    {
      title: 'Accuracy of Information',
      icon: AlertCircle,
      content:
        'While Vyom Research LLP makes every effort to ensure that the information provided in research reports, recommendations, and on our website is accurate and reliable, we cannot guarantee that the data is always up to date, complete, or error-free. Vyom Research LLP disclaims any responsibility for any errors or omissions in the information provided.',
    },
    {
      title: 'Limitation of Liability',
      icon: Lock,
      content:
        'Under no circumstances shall Vyom Research LLP, its partners, employees, or affiliates be liable for any direct, indirect, incidental, or consequential damages arising out of the use or inability to use our website, research reports, recommendations, or services, even if we have been advised of the possibility of such damages.',
    },
    {
      title: 'SEBI Registration',
      icon: FileText,
      content:
        "The registration granted by SEBI and certification from NISM in no way guarantees the performance of the Research Analyst or provides any assurance of returns to investors. The services provided by Vyom Research LLP are strictly in accordance with SEBI's guidelines for Research Analysts.",
    },
  ]

  return (
    <div
      className="bg-gradient-to-br from-blue-50 via-white to-purple-50"
      style={{
        minHeight: `calc(100vh - ${headerHeight}px)`,
        paddingTop: `${headerHeight + 20}px`,
        paddingBottom: '5rem',
      }}
    >
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="px-6 py-12 sm:px-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Disclaimer</h1>
            <p className="text-gray-600 mb-8 text-center">
              The information provided on this website and any research reports, recommendations, or
              materials disseminated by Vyom Research LLP are for informational purposes only. By
              accessing our website or using our services, you agree to the terms and conditions of
              this Disclaimer.
            </p>

            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="mb-8"
              >
                <div className="flex items-center mb-4">
                  <section.icon className="w-6 h-6 text-blue-500 mr-3" />
                  <h2 className="text-2xl font-semibold text-gray-800">{section.title}</h2>
                </div>
                <p className="text-gray-700">{section.content}</p>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-12 p-6 bg-gray-100 rounded-xl"
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                For any questions or concerns regarding this Disclaimer, please contact us at:
              </p>
              <div className="space-y-2">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">
                    Vyom Research LLP, Shop No 238, 2nd Floor, Sky View, Sarthana, Surat, Gujarat,
                    395006
                  </span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">+91-7567540400</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">Compliance@Vyomresearch.in</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Disclaimer