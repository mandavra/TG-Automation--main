'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, Phone, Mail, FileText } from 'lucide-react'

const RefundPolicy = () => {
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

  const policyPoints = [
    {
      icon: ShieldCheck,
      text: 'All sales are final. We do not offer refunds on subscriptions that have already been taken.',
    },
    {
      icon: AlertTriangle,
      text: 'Profit and loss of the services are to be totally borne by the client.',
    },
    {
      icon: AlertTriangle,
      text: 'Always remember Trading/Investment in Securities Markets are always subjected to Market Risk.',
    },
    {
      icon: FileText,
      text: 'We request you to go through our website and read about the Disclaimer, Disclosure, and other terms before subscribing to our services.',
    },
    {
      icon: ShieldCheck,
      text: 'By making the payment for our services, it is acknowledged that the client has read and understood the refund policy.',
    },
    {
      icon: AlertTriangle,
      text: 'Any request by the client to cancel a service or get a refund will NOT be accepted in any case.',
    },
  ]

  return (
    <div
      className="bg-gradient-to-br from-blue-50 via-white to-purple-50"
      style={{
        minHeight: `calc(100vh - ${headerHeight}px)`,
        paddingTop: `${headerHeight + 20}px`, // Add some extra padding
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
            <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Refund Policy</h1>
            <p className="text-gray-600 mb-8 text-center">
              Please read our refund policy carefully before subscribing to our services.
            </p>

            <div className="space-y-6">
              {policyPoints.map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start p-4 bg-blue-50 rounded-lg"
                >
                  <point.icon className="w-6 h-6 text-blue-500 mr-4 flex-shrink-0 mt-1" />
                  <p className="text-gray-700">{point.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-12 p-6 bg-gray-100 rounded-xl"
            >
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Have questions?</h2>
              <p className="text-gray-600 mb-4">
                If you still have any queries, please don't hesitate to contact us:
              </p>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">+91-7567540400</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-blue-500 mr-2" />
                  <a
                    href="mailto:Compliance@Vyomresearch.in"
                    className="text-blue-600 hover:underline"
                  >
                    Compliance@Vyomresearch.in
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default RefundPolicy