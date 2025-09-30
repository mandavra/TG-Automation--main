// GroupDetailsPage.jsx
import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

// Recharts imports (important!)
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie,
  XAxis, YAxis, Tooltip, Legend,
} from "recharts";

export default function GroupDetailsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const tabs = ["Overview", "Subscription plans", "Coupons", "Affiliate"];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <Link to="/admin/group" className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
        <button className="flex items-center text-gray-600 hover:text-black">
          <ArrowLeft size={20} className="mr-1" /> Back to listing page
        </button>
      </Link>

      {/* Channel Info + Tabs */}
      <div className="bg-white rounded-xl shadow p-6 mt-4">
        <div className="flex items-center gap-4">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
            alt="Telegram"
            className="w-16 h-16"
          />
          <div>
            <h2 className="text-xl font-semibold">Accusantium odio fug</h2>
            <p className="text-gray-500 text-sm">Saepe adipisicing in</p>
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
              Waiting to publish
            </span>
          </div>
        </div>

        <div className="flex gap-6 border-b mt-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`pb-2 ${
                activeTab === tab.toLowerCase()
                  ? "border-b-2 border-purple-600 text-purple-600 font-medium"
                  : "text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ============== OVERVIEW (updated like screenshot) ============== */}
      {activeTab === "overview" && (
        <div className="mt-6">
          {/* Big Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total earnings", value: "₹20.87L" },
              { label: "Total purchases", value: "819" },
              { label: "Current active users", value: "579" },
              { label: "Subscriptions expired", value: "185" },
            ].map((c) => (
              <div key={c.label} className="bg-white shadow rounded-xl p-4">
                <div className="text-sm text-gray-600">{c.label}</div>
                <div className="text-2xl font-bold mt-2">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Earnings & Purchases */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="text-lg font-semibold mb-3">Earnings and purchases</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[
                  { name: "16 Aug", earnings: 12000, purchases: 20 },
                  { name: "17 Aug", earnings: 15000, purchases: 18 },
                  { name: "18 Aug", earnings: 46000, purchases: 32 },
                  { name: "19 Aug", earnings: 48000, purchases: 34 },
                  { name: "20 Aug", earnings: 47000, purchases: 33 },
                  { name: "21 Aug", earnings: 30000, purchases: 22 },
                  { name: "22 Aug", earnings: 36000, purchases: 25 },
                ]}
              >
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="earnings" fill="#6366f1" />
                <Bar dataKey="purchases" fill="#93c5fd" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion rate (static rows like screenshot) */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="text-lg font-semibold mb-3">Conversion rate</div>
            {[
              { label: "Landing page link", value: "29.76%" },
              { label: "Direct payment link", value: "0%" },
              { label: "Affiliate payment link", value: "0%" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border rounded-lg px-4 py-3 text-sm text-gray-700 mb-3"
              >
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Best time to sell */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="text-lg font-semibold mb-3">Best time to sell</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={[
                  { time: "12 AM", earnings: 2000 },
                  { time: "6 AM", earnings: 4000 },
                  { time: "8 AM", earnings: 25000 },
                  { time: "10 AM", earnings: 29000 },
                  { time: "12 PM", earnings: 21000 },
                  { time: "2 PM", earnings: 16000 },
                  { time: "4 PM", earnings: 12000 },
                  { time: "6 PM", earnings: 11000 },
                  { time: "8 PM", earnings: 8000 },
                  { time: "10 PM", earnings: 9000 },
                ]}
              >
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="earnings" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 locations */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="text-lg font-semibold mb-3">Top 10 locations by</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                layout="vertical"
                data={[
                  { city: "Pune", value: 12.62 },
                  { city: "Hyderabad", value: 11.35 },
                  { city: "Mumbai", value: 9.87 },
                  { city: "Kolkata", value: 7.05 },
                  { city: "Chennai", value: 6.58 },
                  { city: "Bengaluru", value: 6.38 },
                  { city: "Coimbatore", value: 4.83 },
                  { city: "New Delhi", value: 4.16 },
                  { city: "Ahmedabad", value: 3.96 },
                  { city: "Lucknow", value: 2.15 },
                ]}
              >
                <XAxis type="number" />
                <YAxis dataKey="city" type="category" width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#60a5fa" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Subscriptions overview */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="text-lg font-semibold mb-3">Subscriptions overview</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={[
                  { day: "16 Aug", active: 520 },
                  { day: "17 Aug", active: 525 },
                  { day: "18 Aug", active: 540 },
                  { day: "19 Aug", active: 560 },
                  { day: "20 Aug", active: 575 },
                  { day: "21 Aug", active: 572 },
                  { day: "22 Aug", active: 579 },
                ]}
              >
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="active" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Subscriptions renewal */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="text-lg font-semibold mb-3">Subscriptions renewal</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={[
                  { day: "16 Aug", renewals: 1 },
                  { day: "17 Aug", renewals: 2 },
                  { day: "18 Aug", renewals: 4 },
                  { day: "19 Aug", renewals: 1 },
                  { day: "20 Aug", renewals: 2 },
                  { day: "21 Aug", renewals: 3 },
                  { day: "22 Aug", renewals: 1 },
                ]}
              >
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="renewals" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top 3 subscription plans */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="text-lg font-semibold mb-3">Top 3 subscription plans</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Monthly plan (30 days)", value: 50 },
                    { name: "Yearly plan (365 days)", value: 39 },
                    { name: "Custom plan (60 days)", value: 11 },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  fill="#8884d8"
                  label
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Subscriptions expiring in 7 days */}
          <div className="bg-white rounded-xl shadow p-6 mt-6">
            <div className="text-lg font-semibold mb-3">Subscriptions expiring in 7 days</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { date: "22 Aug", count: 6 },
                  { date: "23 Aug", count: 4 },
                  { date: "24 Aug", count: 6 },
                  { date: "25 Aug", count: 6 },
                  { date: "26 Aug", count: 3 },
                  { date: "27 Aug", count: 4 },
                  { date: "28 Aug", count: 5 },
                ]}
              >
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ================= OTHER TABS (unchanged) ================= */}
      {/* Subscription plans */}
      {activeTab === "subscription plans" && (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Average revenue/subscription purchased</h4>
              <p className="text-2xl font-semibold mt-2">₹0</p>
              <p className="text-sm text-gray-500">For this month</p>
            </div>
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Plan with highest subscriptions sold</h4>
              <p className="text-2xl font-semibold mt-2">0</p>
              <p className="text-sm text-gray-500">For this month</p>
            </div>
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Total subscriptions sold till date</h4>
              <p className="text-2xl font-semibold mt-2">0</p>
              <p className="text-sm text-gray-500">For this month</p>
            </div>
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="min-w-full border rounded-xl bg-white shadow text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-3 text-left">Plan title</th>
                  <th className="p-3 text-left">Plan duration</th>
                  <th className="p-3 text-left">Date of creation</th>
                  <th className="p-3 text-left">Plan price</th>
                  <th className="p-3 text-left">Subscriptions sold & earnings</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3">Quarterly plan</td>
                  <td className="p-3">Quarterly plan (90 days)</td>
                  <td className="p-3">21/8/2025</td>
                  <td className="p-3">₹3</td>
                  <td className="p-3 text-purple-600 cursor-pointer">View details</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coupons */}
      {activeTab === "coupons" && (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Unique active coupons created to date</h4>
              <p className="text-2xl font-semibold mt-2">0</p>
              <p className="text-sm text-gray-500">For this month</p>
            </div>
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Coupons used till date</h4>
              <p className="text-2xl font-semibold mt-2">0</p>
              <p className="text-sm text-gray-500">No coupons applied yet</p>
            </div>
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Revenue from coupon redemption</h4>
              <p className="text-2xl font-semibold mt-2">₹0</p>
              <p className="text-sm text-gray-500">For this month</p>
            </div>
          </div>

          <div className="bg-white shadow rounded-xl p-8 mt-8 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold">No coupons created</h3>
            <p className="text-sm text-gray-500 mt-1">
              Please create your first coupon to get started.
            </p>
            <button className="mt-4 px-6 py-2 bg-black text-white rounded-lg shadow hover:bg-gray-800">
              Create coupon
            </button>
          </div>
        </div>
      )}

      {/* Affiliate */}
      {activeTab === "affiliate" && (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Affiliate sales</h4>
              <p className="text-2xl font-semibold mt-2">0</p>
              <p className="text-sm text-gray-500">For this month</p>
            </div>
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Amount earned from affiliate</h4>
              <p className="text-2xl font-semibold mt-2">₹0</p>
              <p className="text-sm text-gray-500">For this month</p>
            </div>
            <div className="bg-white shadow rounded-xl p-4">
              <h4 className="text-sm text-gray-600">Commission paid to affiliates</h4>
              <p className="text-2xl font-semibold mt-2">₹0</p>
              <p className="text-sm text-gray-500">For this month</p>
            </div>
          </div>

          <div className="bg-white shadow rounded-xl p-8 mt-8 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold">Affiliate is disabled</h3>
            <p className="text-sm text-gray-500 mt-1">
              Please enable your affiliate to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
