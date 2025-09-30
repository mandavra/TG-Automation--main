'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Database,
  UserCheck,
  Lock,
  Cookie,
  UserPlus,
  ExternalLink,
  FileText,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'

const PrivacyPolicy = () => {
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
      title: 'Information We Collect',
      icon: Database,
      content: [
        'Personal Information: Name, email address, phone number, address, and other personal details that you provide when subscribing to our services, submitting a complaint, or contacting us.',
        'Financial Information: Payment details required for processing subscriptions and transactions.',
        'Technical Information: IP address, browser type, operating system, device information, and data collected through cookies and similar technologies.',
      ],
    },
    {
      title: 'Use of Information',
      icon: UserCheck,
      content: [
        'To provide and improve our services.',
        'To communicate with you regarding updates, services, and any inquiries.',
        'To process payments for subscriptions and other services.',
        'To manage and resolve complaints and grievances.',
        'To comply with legal and regulatory requirements.',
      ],
    },
    {
      title: 'Disclosure of Information',
      icon: Shield,
      content: [
        'With Regulatory Authorities: As required by SEBI or other relevant authorities.',
        'With Service Providers: We may share information with trusted service providers who assist us in delivering our services, including payment processors and IT service providers.',
        'For Legal Compliance: We may disclose your information if required by law or to protect the rights and safety of Vyom Research LLP, its clients, or others.',
      ],
    },
    {
      title: 'Data Security',
      icon: Lock,
      content:
        'We implement industry-standard security measures to protect your personal information from unauthorized access, disclosure, or misuse. While we strive to protect your data, please note that no method of transmission over the internet or method of electronic storage is 100% secure.',
    },
    {
      title: 'Cookies and Tracking Technologies',
      icon: Cookie,
      content:
        'Our website uses cookies and similar tracking technologies to enhance your browsing experience. These technologies help us understand user behavior, improve our website, and deliver relevant content. You can control the use of cookies through your browser settings.',
    },
    {
      title: 'Your Rights',
      icon: UserPlus,
      content: [
        'Access: You may request access to the personal information we hold about you.',
        'Correction: You have the right to correct any inaccuracies in your information.',
        'Deletion: You may request the deletion of your personal information, subject to legal and regulatory requirements.',
        'Opt-out: You can opt out of receiving marketing communications from us at any time.',
        'To exercise any of these rights, please contact us at Compliance@Vyomresearch.in.',
      ],
    },
    {
      title: 'Third-Party Links',
      icon: ExternalLink,
      content:
        'Our website may contain links to third-party websites. Vyom Research LLP is not responsible for the privacy practices or the content of these external sites. We encourage you to review the privacy policies of any third-party websites you visit.',
    },
    {
      title: 'Changes to this Privacy Policy',
      icon: FileText,
      content:
        'We may update this Privacy Policy from time to time to reflect changes in our practices or legal obligations. Any updates will be posted on this page, and the revised policy will indicate the date of the latest revision.',
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
            <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Privacy Policy</h1>
            <p className="text-gray-600 mb-8 text-center">
              At Vyom Research LLP, we are committed to protecting the privacy of our clients and
              users. This Privacy Policy outlines how we collect, use, and safeguard your personal
              information when you interact with our services. By accessing our website or using our
              services, you agree to the terms of this Privacy Policy.
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
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions or concerns about this Privacy Policy or our data
                practices, please contact us at:
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

export default PrivacyPolicy