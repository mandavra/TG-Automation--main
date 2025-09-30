'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Target, Briefcase, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

type ContentItem = { subtitle: string; text?: string; items?: string[] }

const InvestorCharter = () => {
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
      title: 'Vision and Mission Statements for investors',
      content: [
        { subtitle: 'Vision', text: 'Invest with knowledge & safety.' },
        {
          subtitle: 'Mission',
          text: 'Every investor should be able to invest in right investment products based on their needs, manage and monitor them to meet their goals, access reports and enjoy financial wellness.',
        },
      ],
    },
    {
      title: 'Details of business transacted by the Research Analyst with respect to the investors',
      content: [
        'To publish research report based on the research activities of the RA.',
        'To provide an independent unbiased view on securities.',
        'To offer unbiased recommendation, disclosing the financial interests in recommended securities.',
        'To provide research recommendation, based on analysis of publicly available information and known observations.',
        'To conduct audit annually.',
      ],
    },
    {
      title: 'Details of services provided to investors (No Indicative Timelines)',
      content: [
        'Onboarding of Clients.',
        'Disclosure to Clients:',
        '- To distribute research reports and recommendations to the clients without discrimination.',
        '- To maintain confidentiality w.r.t publication of the research report until made available in the public domain.',
      ],
    },
    {
      title: 'Details of grievance redressal mechanism and how to access it',
      content: [
        'In case of any grievance / complaint, an investor should approach the concerned research analyst and shall ensure that the grievance is resolved within 30 days.',
        "If the investor's complaint is not redressed satisfactorily, one may lodge a complaint with SEBI on SEBI's SCORES portal which is a centralized web-based complaints redressal system. SEBI takes up the complaints registered via SCORES with the concerned intermediary for timely redressal. SCORES facilitates tracking the status of the complaint.",
        "With regard to physical complaints, investors may send their complaints to: Office of Investor Assistance and Education, Securities and Exchange Board of India, SEBI Bhavan. Plot No. C4-A, 'G' Block, Bandra-Kurla Complex, Bandra (E), Mumbai - 400051.",
      ],
    },
    {
      title: 'Expectations from the investors (Responsibilities of investors)',
      content: [
        {
          subtitle: "Do's",
          items: [
            'Always deal with SEBI registered Research Analyst.',
            'Ensure that the Research Analyst has a valid registration certificate.',
            'Check for SEBI registration number.',
            'Please refer to the list of all SEBI registered Research Analysts which is available on SEBI website in the following link: (https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognised pi=yes&intmId=14)',
            'Always pay attention towards disclosures made in the research reports before investing.',
            'Pay your Research Analyst through banking channels only and maintain duly signed receipts mentioning the details of your payments.',
            'Before buying securities or applying in public offer, check for the research recommendation provided by your research Analyst.',
            'Ask all relevant questions and clear your doubts with your Research Analyst before acting on the recommendation.',
            'Inform SEBI about Research Analyst offering assured or guaranteed returns.',
          ],
        },
        {
          subtitle: "Don'ts",
          items: [
            'Do not provide funds for investment to the Research Analyst.',
            "Don't fall prey to luring advertisements or market rumors.",
            'Do not get attracted to limited period discount or other incentive, gifts, etc. offered by Research Analyst.',
            'Do not share login credentials and password of your trading and demat accounts with the Research Analyst.',
          ],
        },
      ],
    },
  ]

  const hasText = (item: ContentItem): item is { subtitle: string; text: string } => 'text' in item
  const hasItems = (item: ContentItem): item is { subtitle: string; items: string[] } => 'items' in item

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
            <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">Investor Charter</h1>

            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">{section.title}</h2>
                {Array.isArray(section.content) ? (
                  <ul className="list-disc pl-6 space-y-2">
                    {section.content.map((item, itemIndex) => (
                      <li key={itemIndex} className="text-gray-700">
                        {typeof item === 'string' ? (
                          item
                        ) : (
                          <>
                            <strong>{item.subtitle}:</strong>{' '}
                            {hasText(item) ? item.text : null}
                            {hasItems(item) && (
                              <ul className="list-disc pl-6 mt-2 space-y-1">
                                {item.items.map((subItem, subIndex) => (
                                  <li key={subIndex} className="text-gray-600">
                                    {subItem}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
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

export default InvestorCharter