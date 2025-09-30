'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Shield,
  ExternalLink,
  Lock,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'

const TermsOfUse = () => {
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
      title: 'Acceptance of Terms',
      icon: FileText,
      content:
        'By using this website, you acknowledge that you have read, understood, and agree to comply with these Terms of Use, as well as any applicable laws and regulations. Vyom Research LLP reserves the right to modify or update these terms at any time without prior notice. Continued use of the website implies acceptance of the revised terms.',
    },
    {
      title: 'Use of Website',
      icon: Shield,
      content: [
        'The content on this website is provided for informational purposes only. Vyom Research LLP does not guarantee the accuracy, completeness, or timeliness of the information presented.',
        'You agree not to use the website for any unlawful or prohibited activities, including but not limited to:',
        'Disseminating any unlawful, defamatory, harassing, abusive, or otherwise objectionable content.',
        'Attempting to gain unauthorized access to any part of the website or its related systems.',
        'Disrupting or interfering with the security of the website or any services, resources, or networks connected to it.',
      ],
    },
    {
      title: 'Intellectual Property',
      icon: Lock,
      content:
        'All content, including but not limited to text, graphics, logos, images, and software, is the property of Vyom Research LLP or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, modify, or publicly display any content from this website without prior written consent from Vyom Research LLP.',
    },
    {
      title: 'Third-Party Links',
      icon: ExternalLink,
      content:
        'This website may contain links to external websites or services that are not controlled or operated by Vyom Research LLP. These links are provided for your convenience, and Vyom Research LLP is not responsible for the content, privacy policies, or practices of any third-party websites.',
    },
    {
      title: 'Limitation of Liability',
      icon: AlertTriangle,
      content: [
        'Vyom Research LLP will not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the website, including but not limited to:',
        'Errors, mistakes, or inaccuracies of content.',
        'Unauthorized access to or use of our servers and/or any personal information stored therein.',
        'Any bugs, viruses, or the like which may be transmitted through the website.',
      ],
    },
    {
      title: 'Indemnification',
      icon: Shield,
      content:
        'You agree to indemnify and hold harmless Vyom Research LLP, its partners, employees, and affiliates from any claims, damages, liabilities, costs, or expenses arising from your use of the website or your violation of these Terms of Use.',
    },
    {
      title: 'Governing Law',
      icon: FileText,
      content:
        'These Terms of Use are governed by the laws of India. Any disputes arising from or relating to the use of this website will be subject to the exclusive jurisdiction of the courts in Surat, Gujarat.',
    },
    {
      title: 'Termination',
      icon: AlertTriangle,
      content:
        'Vyom Research LLP reserves the right to terminate your access to the website, without any prior notice, if you violate these Terms of Use or engage in activities that are harmful to the website or other users.',
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
            <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Terms of Use</h1>
            <p className="text-gray-600 mb-8 text-center">
              Welcome to Vyom Research LLP's website. By accessing or using our website, you agree
              to be bound by these Terms of Use. If you do not agree with these terms, please do not
              use our website.
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
                {Array.isArray(section.content) ? (
                  <ul className="list-disc pl-6 space-y-2">
                    {section.content.map((item, itemIndex) => (
                      <li key={itemIndex} className="text-gray-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700">{section.content}</p>
                )}
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-12 p-6 bg-gray-100 rounded-xl"
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions regarding these Terms of Use, please contact us at:
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

export default TermsOfUse