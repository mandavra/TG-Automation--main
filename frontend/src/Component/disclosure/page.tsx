'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Info,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
  UserCheck,
} from 'lucide-react'

const Disclosure = () => {
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
      title: 'Purpose',
      content:
        'The purpose of the document is to provide essential information about the Research Services in a manner to assist and enable the prospective client/client in making an informed decision for engaging in Research services before onboarding.',
      icon: Info,
    },
    {
      title: 'History, Present business and Background',
      content:
        'Vyom Research LLP is registered with SEBI as Research Analyst with registration no. INH000018221. The Research Analyst got its registration on Aug 06, 2024 and is engaged in offering research and recommendation services.',
      icon: Clock,
    },
    {
      title: 'Terms and conditions of Research Services',
      content: [
        'The Research Services will be limited to providing independent research recommendation and shall not be involved in any advisory or portfolio allocation services.',
        'The Research Analyst never guarantees the returns on the recommendation provided. Investor shall take note that Investment/trading in stocks/Index or other securities is always subject to market risk. Past performance is never a guarantee of same future results.',
        'The Research Analyst shall not be responsible for any loss to the Investors.',
      ],
      icon: FileText,
    },
    {
      title: 'Disciplinary history',
      content: [
        'There are no pending material litigations or legal proceedings against the Research Analyst.',
        'As on date, no penalties / directions have been issued by SEBI under the SEBI Act or Regulations made there under against the Research Analyst relating to Research Analyst services.',
      ],
      icon: Shield,
    },
    {
      title: 'Details of its associates',
      content: 'No associates',
      icon: UserCheck,
    },
    {
      title: 'Disclosures with respect to Research and Recommendations Services',
      content: [
        'The Research Analyst or any of its officer/employee does not trade in securities which are subject matter of recommendation.',
        'There are no actual or potential conflicts of interest arising from any connection to or association with any issuer of products/ securities, including any material information or facts that might compromise its objectivity or independence in the carrying on of Research Analyst services. Such conflict of interest shall be disclosed to the client as and when they arise.',
        'Research Analyst or its employee or its associates have not received any compensation from the company which is subject matter of recommendation.',
        'Research Analyst or its employee or its associates have not managed or co-managed the public offering of any company.',
        'Research Analyst or its employee or its associates have not received any compensation for investment banking or merchant banking of brokerage services from the subject company.',
        'Research Analyst or its employee or its associates have not received any compensation for products or services other than above from the subject company.',
        'Research Analyst or its employee or its associates have not received any compensation or other benefits from the Subject Company or 3rd party in connection with the research report/ recommendation.',
        'The subject company was not a client of Research Analyst or its employee or its associates during twelve months preceding the date of recommendation services provided.',
        'Research Analysts or its employee or its associates has not served as an officer, director or employee of the subject company.',
        'Research Analysts has not been engaged in market making activity of the subject company.',
      ],
      icon: CheckCircle,
    },
    {
      title: 'Standard Warning',
      content:
        '"Investment in securities market are subject to market risks. Read all the related documents carefully before investing."',
      icon: AlertTriangle,
    },
    {
      title: 'Disclaimer',
      content:
        '"Registration granted by SEBI, and certification from NISM in no way guarantee performance of the Research Analyst or provide any assurance of returns to investors."',
      icon: XCircle,
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
            <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Disclosure</h1>

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
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Disclosure