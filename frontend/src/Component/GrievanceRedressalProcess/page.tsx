'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Phone, Mail, MapPin, Clock, ExternalLink, User } from 'lucide-react'

const GrievanceRedressalProcess = () => {
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

  const escalationMatrix = [
    {
      designation: 'Customer Care',
      name: 'Kuldeep Butani',
      address: 'Shop No 238, 2nd Floor, Sky View, Sarthana, Surat, Gujarat, 395006',
      contact: '+91 7567540400',
      email: 'Compliance@Vyomresearch.in',
      hours: 'Mon-Fri 09AM -- 05 PM'
    },
    {
      designation: 'Head of Customer Care',
      name: '--',
      address: '--',
      contact: '--',
      email: '--',
      hours: '--'
    },
    {
      designation: 'Compliance Officer',
      name: 'Kuldeep Butani',
      address: 'Shop No 238, 2nd Floor, Sky View, Sarthana, Surat, Gujarat, 395006',
      contact: '+91 7567540400',
      email: 'Compliance@Vyomresearch.in',
      hours: 'Mon-Fri 09AM -- 05 PM'
    },
    {
      designation: 'CEO',
      name: '--',
      address: '--',
      contact: '--',
      email: '--',
      hours: '--'
    },
    {
      designation: 'Principal Officer',
      name: 'Kuldeep Butani',
      address: 'Shop No 238, 2nd Floor, Sky View, Sarthana, Surat, Gujarat, 395006',
      contact: '+91 7567540400',
      email: 'Compliance@Vyomresearch.in',
      hours: 'Mon-Fri 09AM -- 05 PM'
    }
  ]

  return (
    <div
      className="bg-gradient-to-br from-blue-50 via-white to-purple-50"
      style={{
        minHeight: `calc(100vh - ${headerHeight}px)`,
        paddingTop: `${headerHeight}px`,
      }}
    >
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[1200px] mx-auto bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-6 text-center">
              Grievance Redressal / Escalation Matrix
            </h1>

            {/* Escalation Matrix Section */}
            <div className="mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
                If you have a grievance, you can reach out to our Support Team for assistance.
              </h2>
              
                  <div className="relative rounded-xl overflow-hidden shadow-lg">
                <div className="sm:w-full overflow-x-auto lg:overflow-x-visible">
                  <div className="min-w-full">
                    <table className="w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
                          <th scope="col" className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-white w-[12%]">
                            Designation
                          </th>
                          <th scope="col" className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-white w-[12%]">
                            Contact Person
                          </th>
                          <th scope="col" className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-white w-[36%]">
                            Address
                          </th>
                          <th scope="col" className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-white w-[13%]">
                            Contact No.
                          </th>
                          <th scope="col" className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-white w-[15%]">
                            Email-ID
                          </th>
                          <th scope="col" className="px-4 sm:px-6 py-4 text-left text-sm font-semibold text-white w-[12%]">
                            Working Hours
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {escalationMatrix.map((level, index) => (
                          <tr 
                            key={index}
                            className="hover:bg-blue-50/50 transition-colors duration-200"
                          >
                            <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                              {level.designation}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {level.name}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">
                              {level.address}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {level.contact !== '--' ? (
                                <a href={`tel:${level.contact}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                                  {level.contact}
                                </a>
                              ) : (
                                level.contact
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-700">
                              {level.email !== '--' ? (
                                <a href={`mailto:${level.email}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                                  {level.email}
                                </a>
                              ) : (
                                level.email
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {level.hours}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-gray-600 text-sm italic px-2">
                <p>
                  The abovementioned details would facilitate the complainants to approach the concerned RA before filing complaint to SEBI. For more details go to:{' '}
                  <a 
                    href="https://www.bseindia.com/markets/MarketInfo/DispNewNoticesCirculars.aspx?page=20241209-41" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    BSE India Notice
                  </a>
                </p>
              </div>
            </div>

            {/* Resolution Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8 p-4 sm:p-6 bg-blue-50 rounded-xl"
            >
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
                Resolution Timeline
              </h2>
              <p className="text-gray-700">
                We aim to resolve all grievances within 21 working days from the date of receipt.
              </p>
            </motion.div>

            {/* Escalation Options */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-4"
            >
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
                Further Escalation Options
              </h2>
              
              <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">SEBI SCORES Platform</h3>
                <p className="text-gray-700 mb-4">
                  If your grievance is not resolved within the timeframe, you can escalate it to SEBI's SCORES Platform (SEBI Complaints Redress System).
                </p>
                <a 
                  href="https://scores.gov.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Access SCORES Portal
                </a>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Online Dispute Resolution (ODR)</h3>
                <p className="text-gray-700 mb-4">
                  In case you are unsatisfied with the resolution provided through our support or the SCORES platform, you can access the Online Dispute Resolution (ODR) Portal.
                </p>
                <a 
                  href="https://smartodr.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Access ODR Portal
                </a>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default GrievanceRedressalProcess